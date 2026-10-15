/**
 * Cálculos de leitura do painel e do relatório de presença. Funções puras
 * sobre o que o repositório de consulta já leu; nada aqui grava.
 */

export type ChegadasPorHora = Array<{ hour: string; count: number }>;

/** Agrupa horários de entrada pela hora cheia em UTC (ISO, ex.: 2026-07-01T20:00:00.000Z). */
export function agruparPorHora(horarios: readonly Date[]): ChegadasPorHora {
  const porHora = new Map<string, number>();

  for (const horario of horarios) {
    const hora = horario.toISOString().slice(0, 13) + ":00:00.000Z";
    porHora.set(hora, (porHora.get(hora) ?? 0) + 1);
  }

  return Array.from(porHora.entries()).map(([hour, count]) => ({ hour, count }));
}

export function taxaDeComparecimento(presentes: number, total: number): number {
  return total > 0 ? Math.round((presentes / total) * 100) : 0;
}

export type ContagensDoPainel = {
  totalGuests: number;
  checkedIn: number;
  duplicateAttempts: number;
};

export function indicadoresDoPainel(contagens: ContagensDoPainel) {
  return {
    totalGuests: contagens.totalGuests,
    checkedIn: contagens.checkedIn,
    absent: Math.max(contagens.totalGuests - contagens.checkedIn, 0),
    attendanceRate: taxaDeComparecimento(contagens.checkedIn, contagens.totalGuests),
    duplicateAttempts: contagens.duplicateAttempts
  };
}

export type ConvidadoDoRelatorio = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  category: string;
};

export type EntradaValida = {
  guestId: string | null;
  checkedInAt: Date;
};

/** Presente é quem tem ao menos uma entrada válida (aprovada ou manual). */
export function separarPresenca<C extends ConvidadoDoRelatorio>(
  convidados: readonly C[],
  entradasValidas: readonly EntradaValida[]
) {
  const presentes = new Set(entradasValidas.map((entrada) => entrada.guestId).filter(Boolean));

  return {
    present: convidados.filter((convidado) => presentes.has(convidado.id)),
    absent: convidados.filter((convidado) => !presentes.has(convidado.id))
  };
}

export type SituacaoNoRelatorio = "PRESENT" | "ABSENT";

export type LinhaDoRelatorio = {
  name: string;
  email: string | null;
  phone: string | null;
  category: string;
  status: SituacaoNoRelatorio;
};

/** Linhas exportadas: primeiro os presentes, depois os ausentes. */
export function linhasDoRelatorio(
  present: readonly ConvidadoDoRelatorio[],
  absent: readonly ConvidadoDoRelatorio[]
): LinhaDoRelatorio[] {
  const linha = (convidado: ConvidadoDoRelatorio, status: SituacaoNoRelatorio): LinhaDoRelatorio => ({
    name: convidado.name,
    email: convidado.email,
    phone: convidado.phone,
    category: convidado.category,
    status
  });

  return [
    ...present.map((convidado) => linha(convidado, "PRESENT")),
    ...absent.map((convidado) => linha(convidado, "ABSENT"))
  ];
}

export function paraCsv(linhas: readonly LinhaDoRelatorio[]): string {
  const rows = [
    ["name", "email", "phone", "category", "status"],
    ...linhas.map((linha) => [linha.name, linha.email ?? "", linha.phone ?? "", linha.category, linha.status])
  ];

  return rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
}
