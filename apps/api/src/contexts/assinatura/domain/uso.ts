import type { UsoDoPeriodo } from "../../../shared/kernel";
import type { Plano } from "./assinatura";

export type PeriodoDeCobranca = {
  inicio: Date;
  fim: Date;
};

export type UsoDoMes = {
  periodStart: Date;
  periodEnd: Date;
  guestsUsed: number;
  checkinsUsed: number;
  includedGuests: number;
  overageGuests: number;
  overageAmountCents: number;
};

/** Mês corrente: do dia 1 às 23:59:59 do último dia (horário local do servidor). */
export function periodoDoMes(agora: Date): PeriodoDeCobranca {
  return {
    inicio: new Date(agora.getFullYear(), agora.getMonth(), 1),
    fim: new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59)
  };
}

/** Excedente: convidados acima da franquia do plano, cobrados por unidade. */
export function calcularUso(
  plano: Pick<Plano, "includedGuests" | "overageCents"> | null,
  medicao: UsoDoPeriodo,
  periodo: PeriodoDeCobranca
): UsoDoMes {
  const includedGuests = plano?.includedGuests ?? 0;
  const overageGuests = Math.max(medicao.guestsUsed - includedGuests, 0);

  return {
    periodStart: periodo.inicio,
    periodEnd: periodo.fim,
    guestsUsed: medicao.guestsUsed,
    checkinsUsed: medicao.checkinsUsed,
    includedGuests,
    overageGuests,
    overageAmountCents: overageGuests * (plano?.overageCents ?? 0)
  };
}
