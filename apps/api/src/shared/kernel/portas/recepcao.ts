import type { Ator, EventId, TenantId } from "../tipos";

// Portas implementadas por Recepção.

export type UsoDoPeriodo = {
  guestsUsed: number;
  checkinsUsed: number;
};

/** Medição de uso para cobrança: convidados e entradas válidas no período. */
export interface MedirUso {
  medir(tenantId: TenantId, inicio: Date, fim: Date): Promise<UsoDoPeriodo>;
}
export const MEDIR_USO = Symbol("MedirUso");

/** Responde apenas se o ator pode ver o evento. */
export interface AutorizarAcessoAoEvento {
  podeVer(ator: Ator, eventId: EventId): Promise<boolean>;
}
export const AUTORIZAR_ACESSO_AO_EVENTO = Symbol("AutorizarAcessoAoEvento");
