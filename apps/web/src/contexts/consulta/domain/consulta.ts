// Consulta no front: painel, relatório de presença e entradas ao vivo. Só leitura.

type EventoResumido = {
  id: string;
  name: string;
  startsAt: string;
  locationName: string;
  capacity: number;
  status: string;
};

export type EventDashboard = {
  event: EventoResumido;
  totalGuests: number;
  checkedIn: number;
  absent: number;
  attendanceRate: number;
  duplicateAttempts: number;
  invitationsByStatus: { status: string; _count: { status: number } }[];
  checkinsByHour: { hour: string; count: number }[];
};

export type ReportSummary = {
  event: EventoResumido;
  kpis: {
    totalGuests: number;
    present: number;
    absent: number;
    attendanceRate: number;
    duplicateAttempts: number;
  };
  arrivalsByHour: { hour: string; count: number }[];
};

export type CheckinRow = {
  id: string;
  result: string;
  reason: string | null;
  checkedInAt: string;
  guest: { id: string; name: string } | null;
  operator: { id: string; name: string } | null;
};

export type FormatoDeRelatorio = "pdf" | "excel" | "csv";

export const FORMATOS_DE_RELATORIO: { label: string; value: FormatoDeRelatorio }[] = [
  { label: "PDF", value: "pdf" },
  { label: "Excel", value: "excel" },
  { label: "CSV", value: "csv" }
];

export function extensaoDoRelatorio(formato: FormatoDeRelatorio): string {
  return formato === "excel" ? "xlsx" : formato;
}

/** O que o painel geral precisa de cada evento (vem da listagem da Recepção). */
export type EventoComContagens = {
  name: string;
  status: string;
  _count?: { guests: number; checkins: number };
};

/** Indicadores do painel geral, somando todos os eventos do tenant. */
export function resumoDosEventos(eventos: readonly EventoComContagens[]) {
  const totalGuests = eventos.reduce((sum, event) => sum + (event._count?.guests ?? 0), 0);
  const totalCheckins = eventos.reduce((sum, event) => sum + (event._count?.checkins ?? 0), 0);
  const activeEvents = eventos.filter((event) => event.status === "ACTIVE").length;

  return {
    totalEvents: eventos.length,
    totalGuests,
    totalCheckins,
    activeEvents,
    attendanceRate: totalGuests > 0 ? Math.round((totalCheckins / totalGuests) * 100) : 0
  };
}

/** Presentes x ausentes dos primeiros eventos, para o gráfico de barras. */
export function presencaPorEvento(eventos: readonly EventoComContagens[], limite = 6) {
  return eventos.slice(0, limite).map((event) => ({
    name: event.name.length > 14 ? `${event.name.slice(0, 14)}...` : event.name,
    presentes: event._count?.checkins ?? 0,
    ausentes: Math.max((event._count?.guests ?? 0) - (event._count?.checkins ?? 0), 0)
  }));
}
