import type { Usuario } from "../usuario/usuario";

export const DIAS_DE_VALIDADE_DO_REFRESH = 7;
export const MINUTOS_DE_VALIDADE_DA_REDEFINICAO = 60;

export type RefreshToken = {
  id: string;
  userId: string;
  family: string;
  revokedAt: Date | null;
  expiresAt: Date;
};

export type RefreshTokenComUsuario = RefreshToken & { usuario: Usuario };

export type NovoRefreshToken = {
  userId: string;
  tokenHash: string;
  family: string;
  expiresAt: Date;
};

/** Refresh token só renova enquanto não foi revogado, não venceu e o usuário segue ativo. */
export function podeRenovar(token: RefreshTokenComUsuario | null, agora: Date): token is RefreshTokenComUsuario {
  return Boolean(token && !token.revokedAt && token.expiresAt >= agora && token.usuario.ativo);
}

export function validadeDoRefresh(agora: Date): Date {
  const expiraEm = new Date(agora);
  expiraEm.setDate(expiraEm.getDate() + DIAS_DE_VALIDADE_DO_REFRESH);
  return expiraEm;
}

export type PedidoDeRedefinicao = {
  id: string;
  userId: string;
  usedAt: Date | null;
  expiresAt: Date;
};

export type NovoPedidoDeRedefinicao = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export function validadeDaRedefinicao(agora: Date): Date {
  return new Date(agora.getTime() + MINUTOS_DE_VALIDADE_DA_REDEFINICAO * 60 * 1000);
}

/** Link de redefinição é de uso único e vence em uma hora. */
export function redefinicaoUtilizavel(
  pedido: PedidoDeRedefinicao | null,
  agora: Date
): pedido is PedidoDeRedefinicao {
  return Boolean(pedido && !pedido.usedAt && pedido.expiresAt >= agora);
}
