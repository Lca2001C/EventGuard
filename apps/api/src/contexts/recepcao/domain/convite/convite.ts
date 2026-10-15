import { Invalido } from "../../../../shared/kernel";
import type { DadosDoConvidado } from "../convidado/convidado";
import type { DadosDoEvento, Evento } from "../evento/evento";

export type SituacaoDoConvite =
  | "PENDING"
  | "SENT"
  | "CONFIRMED"
  | "DECLINED"
  | "CHECKED_IN"
  | "CANCELLED";

export type DadosDoConvite = {
  id: string;
  tenantId: string;
  eventId: string;
  guestId: string;
  tokenHash: string;
  tokenLast4: string;
  status: SituacaoDoConvite;
  expiresAt: Date | null;
  sentAt: Date | null;
  confirmedAt: Date | null;
  checkedInAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type ConviteComEventoEConvidado = DadosDoConvite & {
  event: DadosDoEvento;
  guest: DadosDoConvidado;
};

export type NovoConvite = {
  tenantId: string;
  eventId: string;
  guestId: string;
  tokenHash: string;
  tokenLast4: string;
  status: SituacaoDoConvite;
  expiresAt: Date;
};

export type AlteracaoDoConvite = {
  tokenHash?: string;
  tokenLast4?: string;
  status?: SituacaoDoConvite;
  sentAt?: Date;
  confirmedAt?: Date;
  checkedInAt?: Date;
};

/** O token em claro só existe na emissão; o banco guarda o hash. */
export type TokenDoConvite = {
  valor: string;
  hash: string;
};

/** Convites ainda válidos de um convidado; são cancelados quando outro é emitido. */
export const SITUACOES_SUBSTITUIVEIS: readonly SituacaoDoConvite[] = ["PENDING", "SENT", "CONFIRMED"];

/** Convites que entram num disparo de envio. */
export const SITUACOES_ENVIAVEIS: readonly SituacaoDoConvite[] = ["PENDING", "SENT"];

const DIAS_DE_VALIDADE_APOS_O_EVENTO = 7;

/** Agregado Convite: QR de uso único, confirmação e validade do link. */
export class Convite {
  private constructor(private readonly dados: DadosDoConvite) {}

  static reconstituir(dados: DadosDoConvite): Convite {
    return new Convite(dados);
  }

  static emitir(evento: Evento, guestId: string, token: TokenDoConvite, expiraEm?: Date): NovoConvite {
    return {
      tenantId: evento.tenantId,
      eventId: evento.id,
      guestId,
      tokenHash: token.hash,
      tokenLast4: token.valor.slice(-4),
      status: "PENDING",
      expiresAt: expiraEm ?? adicionarDias(evento.fim, DIAS_DE_VALIDADE_APOS_O_EVENTO)
    };
  }

  get id(): string {
    return this.dados.id;
  }

  get guestId(): string {
    return this.dados.guestId;
  }

  /** Convite removido ou vencido não é exibido nem confirmado pelo link público. */
  acessivelEm(agora: Date): boolean {
    if (this.dados.deletedAt) {
      return false;
    }

    return !(this.dados.expiresAt && this.dados.expiresAt < agora);
  }

  /** Cada envio troca o token, para que o link entregue seja sempre válido. */
  enviar(token: TokenDoConvite, agora: Date): AlteracaoDoConvite {
    return {
      tokenHash: token.hash,
      tokenLast4: token.valor.slice(-4),
      status: "SENT",
      sentAt: agora
    };
  }

  confirmar(agora: Date): AlteracaoDoConvite {
    if (this.dados.status === "CANCELLED" || this.dados.status === "DECLINED") {
      throw new Invalido("Invitation cannot be confirmed");
    }

    return { status: "CONFIRMED", confirmedAt: agora };
  }

  /**
   * Uso do QR na portaria. O repositório só aplica a alteração se o convite
   * ainda não tiver sido usado, o que mantém o uso único sob concorrência.
   */
  registrarEntrada(agora: Date): AlteracaoDoConvite {
    return { status: "CHECKED_IN", checkedInAt: agora };
  }
}

function adicionarDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}
