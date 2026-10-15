import { Inject, Injectable } from "@nestjs/common";
import {
  CONSULTAR_CONTA,
  GERADOR_DE_TOKENS,
  NaoAutenticado,
  RELOGIO,
  type ConsultarConta,
  type GeradorDeTokens,
  type Relogio
} from "../../../../shared/kernel";
import { podeRenovar } from "../../domain/sessao/credenciais";
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository
} from "../../domain/sessao/credenciais.repository";
import { USUARIO_REPOSITORY, type UsuarioRepository } from "../../domain/usuario/usuario.repository";
import { TOKENS_DE_ACESSO, type TokensDeAcesso } from "../portas";
import { EmitirSessao } from "./emitir-sessao";

@Injectable()
export class RenovarSessao {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    private readonly emitirSessao: EmitirSessao,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(refreshToken: string) {
    const agora = this.relogio.agora();
    const stored = await this.refreshTokens.buscarPorHash(this.tokens.hash(refreshToken));

    if (!podeRenovar(stored, agora)) {
      throw new NaoAutenticado("Invalid refresh token");
    }

    await this.refreshTokens.revogar(stored.id, agora);

    return this.emitirSessao.executar(stored.usuario, stored.family, stored.id);
  }
}

@Injectable()
export class Sair {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(refreshToken: string) {
    await this.refreshTokens.revogarPorHash(this.tokens.hash(refreshToken), this.relogio.agora());
    return { ok: true };
  }
}

export type UsuarioAutenticado = {
  id: string;
  tenantId: string | null;
  tenantStatus: string | null;
  email: string;
  name: string;
  roles: string[];
};

/** Valida o access token de cada requisição e devolve quem está chamando. */
@Injectable()
export class AutenticarAcesso {
  constructor(
    @Inject(TOKENS_DE_ACESSO) private readonly tokensDeAcesso: TokensDeAcesso,
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(CONSULTAR_CONTA) private readonly contas: ConsultarConta,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(accessToken: string): Promise<UsuarioAutenticado> {
    const { sub } = await this.tokensDeAcesso.lerAcesso(accessToken);
    const usuario = await this.usuarios.buscarAtivo(sub);

    if (!usuario) {
      throw new NaoAutenticado("Invalid session");
    }

    if (usuario.bloqueadoEm(this.relogio.agora())) {
      throw new NaoAutenticado("User is temporarily locked");
    }

    const conta = usuario.tenantId ? await this.contas.resumo(usuario.tenantId) : null;

    return {
      id: usuario.id,
      tenantId: usuario.tenantId,
      tenantStatus: conta?.status ?? null,
      email: usuario.email,
      name: usuario.nome,
      roles: usuario.papeis
    };
  }
}
