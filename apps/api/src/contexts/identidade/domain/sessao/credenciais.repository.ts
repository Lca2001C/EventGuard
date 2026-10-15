import type {
  NovoPedidoDeRedefinicao,
  NovoRefreshToken,
  PedidoDeRedefinicao,
  RefreshTokenComUsuario
} from "./credenciais";

export interface RefreshTokenRepository {
  buscarPorHash(tokenHash: string): Promise<RefreshTokenComUsuario | null>;
  criar(token: NovoRefreshToken): Promise<{ id: string }>;
  revogar(id: string, agora: Date): Promise<void>;
  /** Revoga pelo hash, se ainda estiver ativo (logout). */
  revogarPorHash(tokenHash: string, agora: Date): Promise<void>;
  /** Encerra todas as sessões do usuário (troca ou redefinição de senha). */
  revogarDoUsuario(userId: string, agora: Date): Promise<void>;
  registrarSubstituto(id: string, substitutoId: string): Promise<void>;
}
export const REFRESH_TOKEN_REPOSITORY = Symbol("RefreshTokenRepository");

export interface PedidoDeRedefinicaoRepository {
  criar(pedido: NovoPedidoDeRedefinicao): Promise<void>;
  buscarPorHash(tokenHash: string): Promise<PedidoDeRedefinicao | null>;
  marcarUsado(id: string, agora: Date): Promise<void>;
}
export const PEDIDO_DE_REDEFINICAO_REPOSITORY = Symbol("PedidoDeRedefinicaoRepository");
