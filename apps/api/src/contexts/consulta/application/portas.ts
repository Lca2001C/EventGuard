import type { ConvidadoDoRelatorio, EntradaValida, LinhaDoRelatorio } from "../domain/presenca";

// Portas de leitura da Consulta. Só leem; a implementação Prisma fica na
// infrastructure deste contexto e sempre filtra por tenant.

export type EventoLido = { id: string; tenantId: string; name: string } & Record<string, unknown>;

export type ConvidadoLido = ConvidadoDoRelatorio & Record<string, unknown>;

export type LeituraDoPainel = {
  totalGuests: number;
  checkedIn: number;
  duplicateAttempts: number;
  invitationsByStatus: unknown[];
  /** Horário de todas as leituras do evento, de qualquer resultado. */
  horarios: Date[];
};

export type LeituraDoRelatorio = {
  guests: ConvidadoLido[];
  entradasValidas: EntradaValida[];
  duplicateAttempts: number;
};

export interface LeiturasDaConsulta {
  /** Evento não removido; tenantId null não restringe (super admin). */
  evento(eventId: string, tenantId: string | null): Promise<EventoLido | null>;
  painel(eventId: string, tenantId: string): Promise<LeituraDoPainel>;
  relatorio(eventId: string, tenantId: string): Promise<LeituraDoRelatorio>;
  entradasRecentes(eventId: string, tenantId: string): Promise<unknown[]>;
  contaDoTenant(tenantId: string): Promise<unknown | null>;
  contas(): Promise<unknown[]>;
}
export const LEITURAS_DA_CONSULTA = Symbol("LeiturasDaConsulta");

export type RelatorioParaPdf = {
  eventName: string;
  kpis: {
    totalGuests: number;
    present: number;
    absent: number;
    attendanceRate: number;
    duplicateAttempts: number;
  };
  present: ConvidadoDoRelatorio[];
};

export interface ExportadorDeRelatorio {
  planilha(linhas: LinhaDoRelatorio[]): Promise<Buffer>;
  pdf(relatorio: RelatorioParaPdf): Promise<Buffer>;
}
export const EXPORTADOR_DE_RELATORIO = Symbol("ExportadorDeRelatorio");
