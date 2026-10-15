import { Invalido } from "../../../../shared/kernel";

export type SituacaoDoEvento = "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED" | "CANCELLED";

export type DadosDoEvento = {
  id: string;
  tenantId: string;
  createdById: string | null;
  name: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  locationName: string;
  address: string | null;
  capacity: number;
  allowCompanions: boolean;
  maxCompanionsPerGuest: number;
  checkinStartsAt: Date | null;
  checkinEndsAt: Date | null;
  status: SituacaoDoEvento;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type AberturaDeEvento = {
  tenantId: string;
  createdById: string;
  name: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  locationName: string;
  address?: string;
  capacity: number;
  allowCompanions: boolean;
  maxCompanionsPerGuest: number;
  checkinStartsAt?: Date;
  checkinEndsAt?: Date;
};

export type NovoEvento = Omit<AberturaDeEvento, "checkinStartsAt" | "checkinEndsAt"> & {
  checkinStartsAt: Date;
  checkinEndsAt: Date;
  status: SituacaoDoEvento;
};

/** Campos ausentes (undefined) ficam como estão. */
export type AlteracaoDoEvento = {
  name?: string;
  description?: string;
  startsAt?: Date;
  endsAt?: Date;
  locationName?: string;
  address?: string;
  capacity?: number;
  allowCompanions?: boolean;
  maxCompanionsPerGuest?: number;
  checkinStartsAt?: Date;
  checkinEndsAt?: Date;
  status?: SituacaoDoEvento;
  deletedAt?: Date;
};

/** Agregado Evento: janela, lotação e regras de acompanhante. */
export class Evento {
  private constructor(private readonly dados: DadosDoEvento) {}

  static reconstituir(dados: DadosDoEvento): Evento {
    return new Evento(dados);
  }

  static abrir(abertura: AberturaDeEvento): NovoEvento {
    garantirInicioAntesDoFim(abertura.startsAt, abertura.endsAt);

    return {
      tenantId: abertura.tenantId,
      createdById: abertura.createdById,
      name: abertura.name,
      description: abertura.description,
      startsAt: abertura.startsAt,
      endsAt: abertura.endsAt,
      locationName: abertura.locationName,
      address: abertura.address,
      capacity: abertura.capacity,
      allowCompanions: abertura.allowCompanions,
      maxCompanionsPerGuest: abertura.allowCompanions ? abertura.maxCompanionsPerGuest : 0,
      checkinStartsAt: abertura.checkinStartsAt ?? abertura.startsAt,
      checkinEndsAt: abertura.checkinEndsAt ?? abertura.endsAt,
      status: "ACTIVE"
    };
  }

  get id(): string {
    return this.dados.id;
  }

  get tenantId(): string {
    return this.dados.tenantId;
  }

  get nome(): string {
    return this.dados.name;
  }

  get local(): string {
    return this.dados.locationName;
  }

  get inicio(): Date {
    return this.dados.startsAt;
  }

  get fim(): Date {
    return this.dados.endsAt;
  }

  get permiteAcompanhantes(): boolean {
    return this.dados.allowCompanions;
  }

  /** As datas só são comparadas entre si quando as duas vêm na alteração. */
  alterar(alteracao: Omit<AlteracaoDoEvento, "deletedAt">): AlteracaoDoEvento {
    if (alteracao.startsAt && alteracao.endsAt) {
      garantirInicioAntesDoFim(alteracao.startsAt, alteracao.endsAt);
    }

    return {
      ...alteracao,
      maxCompanionsPerGuest:
        alteracao.allowCompanions === false ? 0 : alteracao.maxCompanionsPerGuest
    };
  }

  cancelar(agora: Date): AlteracaoDoEvento {
    return { deletedAt: agora, status: "CANCELLED" };
  }

  /** Acompanhantes que um convidado pode levar: zero se o evento não permite. */
  acompanhantesPermitidos(pedidos: number | undefined): number {
    return this.dados.allowCompanions ? pedidos ?? 0 : 0;
  }

  /** Lotação conta cada convidado e os acompanhantes reservados para ele. */
  garantirLotacao(ocupados: number, entrando: number): void {
    if (ocupados + entrando > this.dados.capacity) {
      throw new Invalido("Event capacity reached");
    }
  }
}

function garantirInicioAntesDoFim(inicio: Date, fim: Date): void {
  if (inicio >= fim) {
    throw new Invalido("Event start must be before end");
  }
}
