import { Inject, Injectable } from "@nestjs/common";
import { SETUP_FEES } from "@eventguard/shared";
import {
  ATUALIZAR_SITUACAO_DA_CONTA,
  GERADOR_DE_IDS,
  MEDIR_USO,
  Proibido,
  REGISTRAR_AUDITORIA,
  RELOGIO,
  type Ator,
  type AtualizarSituacaoDaConta,
  type GeradorDeIds,
  type MedirUso,
  type RegistrarAuditoria,
  type Relogio
} from "../../../shared/kernel";
import { Assinatura, type CodigoDoPlano } from "../domain/assinatura";
import {
  ASSINATURA_REPOSITORY,
  PLANO_REPOSITORY,
  type AssinaturaRepository,
  type PlanoRepository
} from "../domain/assinatura.repository";
import { Pagamento } from "../domain/pagamento";
import { PAGAMENTO_REPOSITORY, type PagamentoRepository } from "../domain/pagamento.repository";
import { calcularUso, periodoDoMes } from "../domain/uso";
import { GATEWAY_DE_PAGAMENTO, type GatewayDePagamento } from "./portas";

function tenantDoAtor(ator: Ator): string {
  if (!ator.tenantId) {
    throw new Proibido("Tenant scope is required");
  }

  return ator.tenantId;
}

@Injectable()
export class ListarPlanos {
  constructor(@Inject(PLANO_REPOSITORY) private readonly planos: PlanoRepository) {}

  executar() {
    return this.planos.listar();
  }
}

/** Uso do mês corrente. A contagem vem da Recepção, pela porta MedirUso. */
@Injectable()
export class ConsultarUso {
  constructor(
    @Inject(ASSINATURA_REPOSITORY) private readonly assinaturas: AssinaturaRepository,
    @Inject(MEDIR_USO) private readonly medirUso: MedirUso,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(tenantId: string) {
    const periodo = periodoDoMes(this.relogio.agora());
    const [subscription, medicao] = await Promise.all([
      this.assinaturas.doTenant(tenantId),
      this.medirUso.medir(tenantId, periodo.inicio, periodo.fim)
    ]);

    return calcularUso(subscription?.plan ?? null, medicao, periodo);
  }
}

@Injectable()
export class ConsultarAssinatura {
  constructor(
    @Inject(ASSINATURA_REPOSITORY) private readonly assinaturas: AssinaturaRepository,
    private readonly consultarUso: ConsultarUso
  ) {}

  async executar(ator: Ator) {
    const tenantId = tenantDoAtor(ator);
    const [subscription, usage] = await Promise.all([
      this.assinaturas.doTenant(tenantId),
      this.consultarUso.executar(tenantId)
    ]);

    return { subscription, usage };
  }
}

@Injectable()
export class ListarPagamentos {
  constructor(@Inject(PAGAMENTO_REPOSITORY) private readonly pagamentos: PagamentoRepository) {}

  executar(ator: Ator) {
    return this.pagamentos.listarDoTenant(tenantDoAtor(ator));
  }
}

@Injectable()
export class IniciarCheckoutDeImplantacao {
  constructor(
    @Inject(PAGAMENTO_REPOSITORY) private readonly pagamentos: PagamentoRepository,
    @Inject(GATEWAY_DE_PAGAMENTO) private readonly gateway: GatewayDePagamento,
    @Inject(GERADOR_DE_IDS) private readonly ids: GeradorDeIds
  ) {}

  async executar(ator: Ator, setupCode?: string) {
    const tenantId = tenantDoAtor(ator);
    const fee =
      SETUP_FEES.find((item) => item.code === setupCode) ??
      SETUP_FEES.find((item) => item.code === "SETUP_STANDARD") ??
      SETUP_FEES[0];

    const payment = await this.pagamentos.criar(Pagamento.implantacao(tenantId, fee, this.ids.novo()));
    const checkoutUrl = await this.gateway.criarCheckout(payment.externalReference, fee.label, fee.amountCents);

    return this.pagamentos.alterar(payment.id, { checkoutUrl });
  }
}

@Injectable()
export class IniciarCheckoutDeAssinatura {
  constructor(
    @Inject(PLANO_REPOSITORY) private readonly planos: PlanoRepository,
    @Inject(ASSINATURA_REPOSITORY) private readonly assinaturas: AssinaturaRepository,
    @Inject(PAGAMENTO_REPOSITORY) private readonly pagamentos: PagamentoRepository,
    @Inject(GATEWAY_DE_PAGAMENTO) private readonly gateway: GatewayDePagamento,
    @Inject(GERADOR_DE_IDS) private readonly ids: GeradorDeIds
  ) {}

  async executar(ator: Ator, planCode: CodigoDoPlano) {
    const tenantId = tenantDoAtor(ator);
    const plano = await this.planos.obterPorCodigo(planCode);
    const subscription = await this.assinaturas.salvarDoTenant(
      tenantId,
      Assinatura.aguardarPagamento(plano.id),
      { tenantId, planId: plano.id, status: "INCOMPLETE" }
    );
    const payment = await this.pagamentos.criar(
      Pagamento.mensalidade(tenantId, subscription.id, plano, this.ids.novo())
    );
    const checkoutUrl = await this.gateway.criarCheckout(
      payment.externalReference,
      payment.description,
      payment.amountCents
    );

    return this.pagamentos.alterar(payment.id, { checkoutUrl });
  }
}

/** Troca de plano sem checkout: a assinatura e a conta ficam ativas no novo plano. */
@Injectable()
export class TrocarPlano {
  constructor(
    @Inject(PLANO_REPOSITORY) private readonly planos: PlanoRepository,
    @Inject(ASSINATURA_REPOSITORY) private readonly assinaturas: AssinaturaRepository,
    @Inject(ATUALIZAR_SITUACAO_DA_CONTA) private readonly situacaoDaConta: AtualizarSituacaoDaConta,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(ator: Ator, planCode: CodigoDoPlano) {
    const tenantId = tenantDoAtor(ator);
    const plan = await this.planos.obterPorCodigo(planCode);
    const subscription = await this.assinaturas.salvarDoTenant(tenantId, Assinatura.trocarPlano(plan.id), {
      tenantId,
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: this.relogio.agora()
    });

    await this.situacaoDaConta.atualizar({ tenantId, situacao: "ACTIVE", planId: plan.id });

    await this.auditoria.registrar({
      tenantId,
      actorId: ator.id,
      action: "billing.change_plan",
      entity: "subscription",
      entityId: subscription.id,
      metadata: { planCode }
    });

    return { subscription, plan };
  }
}
