import { Module, forwardRef } from "@nestjs/common";
import { ASSINATURA_INICIAL } from "../../shared/kernel";
import { ContaModule } from "../conta/conta.module";
import { RecepcaoModule } from "../recepcao/recepcao.module";
import { IniciarAssinatura } from "./application/assinatura-inicial";
import {
  ConsultarAssinatura,
  ConsultarUso,
  IniciarCheckoutDeAssinatura,
  IniciarCheckoutDeImplantacao,
  ListarPagamentos,
  ListarPlanos,
  TrocarPlano
} from "./application/cobranca";
import { GATEWAY_DE_PAGAMENTO } from "./application/portas";
import { ProcessarNotificacaoDePagamento } from "./application/processar-notificacao";
import { ASSINATURA_REPOSITORY, PLANO_REPOSITORY } from "./domain/assinatura.repository";
import { NOTIFICACAO_REPOSITORY, PAGAMENTO_REPOSITORY } from "./domain/pagamento.repository";
import { MercadoPagoGateway } from "./infrastructure/mercado-pago.gateway";
import {
  PrismaAssinaturaRepository,
  PrismaPlanoRepository
} from "./infrastructure/prisma-assinatura.repository";
import {
  PrismaNotificacaoRepository,
  PrismaPagamentoRepository
} from "./infrastructure/prisma-pagamento.repository";
import { BillingController } from "./interface/http/billing.controller";

/**
 * Contexto Assinatura: plano, assinatura, pagamento, uso e Mercado Pago.
 * Não altera tenant (porta AtualizarSituacaoDaConta, de Conta) e não conta
 * convidados nem entradas (porta MedirUso, de Recepção).
 */
@Module({
  imports: [forwardRef(() => ContaModule), RecepcaoModule],
  controllers: [BillingController],
  providers: [
    { provide: PLANO_REPOSITORY, useClass: PrismaPlanoRepository },
    { provide: ASSINATURA_REPOSITORY, useClass: PrismaAssinaturaRepository },
    { provide: PAGAMENTO_REPOSITORY, useClass: PrismaPagamentoRepository },
    { provide: NOTIFICACAO_REPOSITORY, useClass: PrismaNotificacaoRepository },
    { provide: GATEWAY_DE_PAGAMENTO, useClass: MercadoPagoGateway },
    IniciarAssinatura,
    ListarPlanos,
    ConsultarUso,
    ConsultarAssinatura,
    ListarPagamentos,
    IniciarCheckoutDeImplantacao,
    IniciarCheckoutDeAssinatura,
    TrocarPlano,
    ProcessarNotificacaoDePagamento,
    { provide: ASSINATURA_INICIAL, useExisting: IniciarAssinatura }
  ],
  exports: [ASSINATURA_INICIAL]
})
export class AssinaturaModule {}
