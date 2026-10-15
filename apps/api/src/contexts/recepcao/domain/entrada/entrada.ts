import type { DecisaoDeEntrada, ResultadoDaEntrada } from "../avaliar-entrada/avaliar-entrada";

export type DadosDaEntrada = {
  id: string;
  tenantId: string;
  eventId: string;
  guestId: string | null;
  invitationId: string | null;
  operatorId: string | null;
  deviceId: string | null;
  tokenHash: string | null;
  result: ResultadoDaEntrada;
  reason: string | null;
  companionCount: number;
  checkedInAt: Date;
  createdAt: Date;
};

export type NovaEntrada = {
  tenantId: string;
  eventId: string;
  guestId?: string;
  invitationId?: string;
  operatorId: string;
  deviceId?: string;
  tokenHash?: string;
  result: ResultadoDaEntrada;
  reason: string;
  companionCount: number;
};

/** Resultados que contam o convidado como presente. */
export const RESULTADOS_DE_PRESENCA: readonly ResultadoDaEntrada[] = ["APPROVED", "MANUAL"];

/**
 * Agregado Entrada: cada tentativa na portaria vira um registro imutável,
 * aprovada ou não, com o operador e o dispositivo que a fizeram.
 */
export const Entrada = {
  registrar(
    origem: Omit<NovaEntrada, "result" | "reason">,
    decisao: DecisaoDeEntrada
  ): NovaEntrada {
    return { ...origem, result: decisao.result, reason: decisao.reason };
  }
};

export type IdentificacaoDoDispositivo = {
  fingerprint: string;
  name: string;
};

/** Aparelho da recepção, reconhecido pela impressão digital enviada pelo app. */
export const Dispositivo = {
  identificar(fingerprint: string | undefined, nome: string | undefined): IdentificacaoDoDispositivo | null {
    if (!fingerprint) {
      return null;
    }

    return { fingerprint, name: nome ?? "Reception device" };
  }
};
