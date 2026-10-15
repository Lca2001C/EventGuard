import { Inject, Injectable } from "@nestjs/common";
import {
  ARMAZENAR_ARQUIVO,
  ASSINATURA_INICIAL,
  NaoEncontrado,
  Proibido,
  REGISTRAR_AUDITORIA,
  RELOGIO,
  type AlteracaoDeSituacao,
  type ArmazenarArquivo,
  type AssinaturaInicial,
  type Ator,
  type AtualizarSituacaoDaConta,
  type RegistrarAuditoria,
  type Relogio,
  type SituacaoDaConta
} from "../../../shared/kernel";
import { Conta, chaveDoLogo, type AlteracaoDaConta } from "../domain/conta";
import { CONTA_REPOSITORY, type ContaRepository } from "../domain/conta.repository";
import { AbrirContaNova } from "./abrir-conta";

function tenantDoAtor(ator: Ator): string {
  if (!ator.tenantId) {
    throw new Proibido("Tenant scope is required");
  }

  return ator.tenantId;
}

/**
 * Implementa a porta AtualizarSituacaoDaConta. É o caminho pelo qual outro
 * contexto (Assinatura) muda Tenant.status.
 */
@Injectable()
export class AlterarSituacaoDaConta implements AtualizarSituacaoDaConta {
  constructor(@Inject(CONTA_REPOSITORY) private readonly contas: ContaRepository) {}

  async atualizar(alteracao: AlteracaoDeSituacao): Promise<void> {
    await this.contas.alterar(
      alteracao.tenantId,
      Conta.mudarSituacao(alteracao.situacao, alteracao.planId)
    );
  }
}

export type MarcaDaConta = {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
};

/** O próprio tenant ajusta nome e marca. */
@Injectable()
export class AtualizarMarca {
  constructor(
    @Inject(CONTA_REPOSITORY) private readonly contas: ContaRepository,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(ator: Ator, marca: MarcaDaConta) {
    const tenant = await this.contas.alterar(tenantDoAtor(ator), {
      name: marca.name,
      logoUrl: marca.logoUrl,
      primaryColor: marca.primaryColor
    });

    await this.auditoria.registrar({
      tenantId: tenant.id,
      actorId: ator.id,
      action: "tenant.update",
      entity: "tenant",
      entityId: tenant.id,
      metadata: marca
    });

    return tenant;
  }
}

export type ArquivoDeLogo = {
  nome: string;
  tipo: string;
  tamanho: number;
  conteudo: Uint8Array;
};

@Injectable()
export class EnviarLogo {
  constructor(
    @Inject(CONTA_REPOSITORY) private readonly contas: ContaRepository,
    @Inject(ARMAZENAR_ARQUIVO) private readonly armazenamento: ArmazenarArquivo,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(ator: Ator, arquivo: ArquivoDeLogo | undefined) {
    const tenantId = tenantDoAtor(ator);
    Conta.validarLogo(arquivo);

    const key = chaveDoLogo(tenantId, arquivo!.nome, this.relogio.agora());
    const logoUrl = await this.armazenamento.armazenar(key, arquivo!.conteudo, arquivo!.tipo);
    const tenant = await this.contas.alterar(tenantId, { logoUrl });

    await this.auditoria.registrar({
      tenantId: tenant.id,
      actorId: ator.id,
      action: "tenant.logo.upload",
      entity: "tenant",
      entityId: tenant.id,
      metadata: { key }
    });

    return { logoUrl };
  }
}

/** Super admin abre uma conta já no plano inicial. */
@Injectable()
export class CriarContaPeloAdmin {
  constructor(
    private readonly abrirConta: AbrirContaNova,
    @Inject(ASSINATURA_INICIAL) private readonly assinaturaInicial: AssinaturaInicial,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(ator: Ator, marca: MarcaDaConta & { name: string }) {
    const plano = await this.assinaturaInicial.planoInicial();
    const tenant = await this.abrirConta.abrir({
      nome: marca.name,
      logoUrl: marca.logoUrl,
      primaryColor: marca.primaryColor,
      planId: plano?.id
    });

    await this.auditoria.registrar({
      actorId: ator.id,
      tenantId: tenant.id,
      action: "admin.tenant.create",
      entity: "tenant",
      entityId: tenant.id
    });

    return tenant;
  }
}

export type AlteracaoPeloAdmin = MarcaDaConta & { status?: SituacaoDaConta };

@Injectable()
export class AlterarContaPeloAdmin {
  constructor(
    @Inject(CONTA_REPOSITORY) private readonly contas: ContaRepository,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(ator: Ator, id: string, alteracao: AlteracaoPeloAdmin) {
    const existing = await this.contas.buscar(id);
    if (!existing || existing.deletedAt) {
      throw new NaoEncontrado("Tenant not found");
    }

    const dados: AlteracaoDaConta = {
      name: alteracao.name,
      logoUrl: alteracao.logoUrl,
      primaryColor: alteracao.primaryColor,
      ...(alteracao.status ? Conta.mudarSituacao(alteracao.status) : {})
    };
    const tenant = await this.contas.alterar(id, dados);

    await this.auditoria.registrar({
      actorId: ator.id,
      tenantId: tenant.id,
      action: "admin.tenant.update",
      entity: "tenant",
      entityId: tenant.id,
      metadata: alteracao
    });

    return tenant;
  }
}
