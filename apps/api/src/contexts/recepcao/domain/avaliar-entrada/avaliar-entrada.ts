import type { SituacaoDoConvite } from "../convite/convite";
import type { SituacaoDoEvento } from "../evento/evento";

/**
 * Política AvaliarEntrada: decide se um QR Code dá acesso ao evento.
 * Função pura; quem persiste a decisão é o caso de uso da Recepção.
 */

export type ResultadoDaEntrada =
  | "APPROVED"
  | "DENIED"
  | "WARNING"
  | "DUPLICATE"
  | "OUT_OF_WINDOW"
  | "WRONG_EVENT"
  | "MANUAL";

export type DecisaoDeEntrada = {
  result: ResultadoDaEntrada;
  reason: string;
};

/** O que a política precisa saber do convite e do evento dele. */
export type ConviteNaPortaria = {
  status: SituacaoDoConvite;
  checkedInAt: Date | null;
  expiresAt: Date | null;
  eventId: string;
  event: {
    status: SituacaoDoEvento;
    startsAt: Date;
    endsAt: Date;
    checkinStartsAt: Date | null;
    checkinEndsAt: Date | null;
  };
};

export const ENTRADA_APROVADA: DecisaoDeEntrada = { result: "APPROVED", reason: "Entry approved" };
export const QR_JA_UTILIZADO: DecisaoDeEntrada = { result: "DUPLICATE", reason: "QR Code already used" };

export function avaliarEntrada(
  convite: ConviteNaPortaria | null,
  eventoEsperado: string | undefined,
  agora: Date
): DecisaoDeEntrada {
  if (!convite) {
    return { result: "DENIED", reason: "Invitation not found" };
  }

  if (eventoEsperado && convite.eventId !== eventoEsperado) {
    return { result: "WRONG_EVENT", reason: "Invitation belongs to another event" };
  }

  if (convite.status === "CHECKED_IN" || convite.checkedInAt) {
    return QR_JA_UTILIZADO;
  }

  if (convite.status === "CANCELLED" || convite.status === "DECLINED") {
    return { result: "DENIED", reason: "Invitation is not active" };
  }

  if (convite.expiresAt && convite.expiresAt < agora) {
    return { result: "DENIED", reason: "Invitation expired" };
  }

  if (convite.event.status !== "ACTIVE") {
    return { result: "DENIED", reason: "Event is not active" };
  }

  const inicioDaJanela = convite.event.checkinStartsAt ?? convite.event.startsAt;
  const fimDaJanela = convite.event.checkinEndsAt ?? convite.event.endsAt;

  if (agora < inicioDaJanela || agora > fimDaJanela) {
    return { result: "OUT_OF_WINDOW", reason: "Check-in is outside the configured window" };
  }

  return ENTRADA_APROVADA;
}

/**
 * Entrada manual (sem QR): a recepção libera pelo nome. A única regra é não
 * contar o mesmo convidado duas vezes.
 */
export function avaliarEntradaManual(jaEntrou: boolean, motivo: string): DecisaoDeEntrada {
  if (jaEntrou) {
    return { result: "DUPLICATE", reason: "Guest already checked in" };
  }

  return { result: "MANUAL", reason: motivo };
}
