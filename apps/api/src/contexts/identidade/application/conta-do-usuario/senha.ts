import { Inject, Injectable } from "@nestjs/common";
import {
  ENVIAR_REDEFINICAO_DE_SENHA,
  GERADOR_DE_TOKENS,
  Invalido,
  REGISTRAR_AUDITORIA,
  RELOGIO,
  UNIDADE_DE_TRABALHO,
  type EnviarRedefinicaoDeSenha,
  type GeradorDeTokens,
  type RegistrarAuditoria,
  type Relogio,
  type UnidadeDeTrabalho
} from "../../../../shared/kernel";
import { redefinicaoUtilizavel, validadeDaRedefinicao } from "../../domain/sessao/credenciais";
import {
  PEDIDO_DE_REDEFINICAO_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  type PedidoDeRedefinicaoRepository,
  type RefreshTokenRepository
} from "../../domain/sessao/credenciais.repository";
import { Usuario } from "../../domain/usuario/usuario";
import { USUARIO_REPOSITORY, type UsuarioRepository } from "../../domain/usuario/usuario.repository";
import {
  HASH_DE_SENHA,
  PARAMETROS_DE_IDENTIDADE,
  type HashDeSenha,
  type ParametrosDeIdentidade
} from "../portas";

/** "Esqueci minha senha": responde igual exista ou não a conta. */
@Injectable()
export class SolicitarRedefinicaoDeSenha {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(PEDIDO_DE_REDEFINICAO_REPOSITORY) private readonly pedidos: PedidoDeRedefinicaoRepository,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    @Inject(ENVIAR_REDEFINICAO_DE_SENHA) private readonly enviarRedefinicao: EnviarRedefinicaoDeSenha,
    @Inject(PARAMETROS_DE_IDENTIDADE) private readonly parametros: ParametrosDeIdentidade,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(email: string) {
    const user = await this.usuarios.buscarContatoPorEmail(email);

    if (user) {
      const token = this.tokens.gerar();
      await this.pedidos.criar({
        userId: user.id,
        tokenHash: this.tokens.hash(token),
        expiresAt: validadeDaRedefinicao(this.relogio.agora())
      });

      const frontendUrl = this.parametros.urlDoFrontend().replace(/\/$/, "");
      await this.enviarRedefinicao.enviar({
        to: user.email,
        name: user.name,
        resetUrl: `${frontendUrl}/reset-password?token=${token}`
      });
    }

    return {
      ok: true,
      message: "If the email exists, reset instructions will be sent"
    };
  }
}

@Injectable()
export class RedefinirSenha {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(PEDIDO_DE_REDEFINICAO_REPOSITORY) private readonly pedidos: PedidoDeRedefinicaoRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    @Inject(HASH_DE_SENHA) private readonly hashDeSenha: HashDeSenha,
    @Inject(UNIDADE_DE_TRABALHO) private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(token: string, password: string) {
    const agora = this.relogio.agora();
    const pedido = await this.pedidos.buscarPorHash(this.tokens.hash(token));

    if (!redefinicaoUtilizavel(pedido, agora)) {
      throw new Invalido("Invalid reset token");
    }

    const passwordHash = await this.hashDeSenha.gerar(password);
    await this.unidadeDeTrabalho.executar(async () => {
      await this.usuarios.alterar(pedido.userId, Usuario.redefinicaoDeSenha(passwordHash));
      await this.pedidos.marcarUsado(pedido.id, agora);
      await this.refreshTokens.revogarDoUsuario(pedido.userId, agora);
    });

    return { ok: true };
  }
}

@Injectable()
export class TrocarSenha {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(HASH_DE_SENHA) private readonly hashDeSenha: HashDeSenha,
    @Inject(UNIDADE_DE_TRABALHO) private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(userId: string, currentPassword: string, newPassword: string) {
    const usuario = await this.usuarios.obterPorId(userId);

    if (!(await this.hashDeSenha.conferir(currentPassword, usuario.hashDaSenha))) {
      throw new Invalido("Current password is incorrect");
    }

    const passwordHash = await this.hashDeSenha.gerar(newPassword);
    await this.unidadeDeTrabalho.executar(async () => {
      await this.usuarios.alterar(userId, { passwordHash });
      await this.refreshTokens.revogarDoUsuario(userId, this.relogio.agora());
    });

    await this.auditoria.registrar({
      tenantId: usuario.tenantId,
      actorId: userId,
      action: "auth.password.change",
      entity: "user",
      entityId: userId
    });

    return { ok: true };
  }
}
