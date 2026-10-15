import { Inject, Injectable } from "@nestjs/common";
import {
  CONSULTAR_CONTA,
  GERADOR_DE_TOKENS,
  RELOGIO,
  type ConsultarConta,
  type GeradorDeTokens,
  type Relogio
} from "../../../../shared/kernel";
import { validadeDoRefresh } from "../../domain/sessao/credenciais";
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository
} from "../../domain/sessao/credenciais.repository";
import type { Usuario } from "../../domain/usuario/usuario";
import {
  PARAMETROS_DE_IDENTIDADE,
  TOKENS_DE_ACESSO,
  type ParametrosDeIdentidade,
  type TokensDeAcesso
} from "../portas";

/**
 * Emite access token + refresh token. Na rotação, o refresh novo herda a
 * família do anterior e o anterior aponta para o substituto.
 */
@Injectable()
export class EmitirSessao {
  constructor(
    @Inject(TOKENS_DE_ACESSO) private readonly tokensDeAcesso: TokensDeAcesso,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    @Inject(CONSULTAR_CONTA) private readonly contas: ConsultarConta,
    @Inject(PARAMETROS_DE_IDENTIDADE) private readonly parametros: ParametrosDeIdentidade,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(usuario: Usuario, familia?: string, anteriorId?: string) {
    const roles = usuario.papeis;
    const accessToken = await this.tokensDeAcesso.assinarAcesso({
      sub: usuario.id,
      tenantId: usuario.tenantId,
      roles
    });
    const refreshToken = this.tokens.gerar(48);
    const stored = await this.refreshTokens.criar({
      userId: usuario.id,
      tokenHash: this.tokens.hash(refreshToken),
      family: familia ?? this.tokens.gerar(16),
      expiresAt: validadeDoRefresh(this.relogio.agora())
    });

    if (anteriorId) {
      await this.refreshTokens.registrarSubstituto(anteriorId, stored.id);
    }

    const tenant = usuario.tenantId ? await this.contas.resumo(usuario.tenantId) : null;

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parametros.validadeDoAcesso(),
      user: {
        id: usuario.id,
        name: usuario.nome,
        email: usuario.email,
        tenantId: usuario.tenantId,
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
              status: tenant.status,
              primaryColor: tenant.primaryColor
            }
          : null,
        roles
      }
    };
  }
}
