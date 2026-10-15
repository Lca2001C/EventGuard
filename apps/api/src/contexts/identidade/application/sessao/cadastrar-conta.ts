import { Inject, Injectable } from "@nestjs/common";
import {
  ABRIR_CONTA,
  ASSINATURA_INICIAL,
  Conflito,
  Invalido,
  REGISTRAR_AUDITORIA,
  RELOGIO,
  UNIDADE_DE_TRABALHO,
  type AbrirConta,
  type AssinaturaInicial,
  type RegistrarAuditoria,
  type Relogio,
  type UnidadeDeTrabalho
} from "../../../../shared/kernel";
import { USUARIO_REPOSITORY, type UsuarioRepository } from "../../domain/usuario/usuario.repository";
import { HASH_DE_SENHA, type HashDeSenha } from "../portas";
import { EmitirSessao } from "./emitir-sessao";
import type { Origem } from "./entrar";

export type CadastroComando = {
  name: string;
  companyName: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

/**
 * Cadastro público: abre a conta (Conta), o período de teste (Assinatura) e
 * o administrador dela (Identidade) numa única transação, por portas.
 */
@Injectable()
export class CadastrarConta {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(HASH_DE_SENHA) private readonly hashDeSenha: HashDeSenha,
    @Inject(ABRIR_CONTA) private readonly abrirConta: AbrirConta,
    @Inject(ASSINATURA_INICIAL) private readonly assinaturaInicial: AssinaturaInicial,
    @Inject(UNIDADE_DE_TRABALHO) private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly emitirSessao: EmitirSessao,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(comando: CadastroComando, origem?: Origem) {
    if (comando.password !== comando.confirmPassword) {
      throw new Invalido("Passwords do not match");
    }

    if (!comando.termsAccepted) {
      throw new Invalido("Terms must be accepted");
    }

    if (await this.usuarios.emailEmUso(comando.email)) {
      throw new Conflito("Email is already registered");
    }

    const passwordHash = await this.hashDeSenha.gerar(comando.password);
    const plano = await this.assinaturaInicial.planoInicial();

    const usuario = await this.unidadeDeTrabalho.executar(async () => {
      const roleId = await this.usuarios.idDoPapel("TENANT_ADMIN");
      const conta = await this.abrirConta.abrir({ nome: comando.companyName, planId: plano?.id });
      const criado = await this.usuarios.criar({
        tenantId: conta.id,
        name: comando.name,
        email: comando.email,
        passwordHash,
        termsAcceptedAt: this.relogio.agora(),
        roleId
      });

      if (plano) {
        await this.assinaturaInicial.iniciarPeriodoDeTeste(conta.id, plano.id);
      }

      return criado;
    });

    await this.auditoria.registrar({
      tenantId: usuario.tenantId,
      actorId: usuario.id,
      action: "auth.register",
      entity: "user",
      entityId: usuario.id,
      ip: origem?.ip,
      userAgent: origem?.userAgent,
      metadata: { companyName: comando.companyName }
    });

    return this.emitirSessao.executar(usuario);
  }
}
