import type { SituacaoDoConvite } from "../convite/convite";
import type { Evento } from "../evento/evento";

export type CategoriaDoConvidado = "COMMON" | "VIP" | "FAMILY" | "STAFF" | "SUPPLIER";

export type DadosDoConvidado = {
  id: string;
  tenantId: string;
  eventId: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  category: CategoriaDoConvidado;
  isVip: boolean;
  companionLimit: number;
  notes: string | null;
  invitationStatus: SituacaoDoConvite;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type Acompanhante = {
  name: string;
  document?: string;
};

/** Dados de cadastro vindos de formulário, planilha ou CSV. */
export type FichaDoConvidado = {
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  category?: CategoriaDoConvidado;
  isVip?: boolean;
  companionLimit?: number;
  notes?: string;
  companions?: Acompanhante[];
};

export type NovoConvidado = {
  tenantId: string;
  eventId: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  category: CategoriaDoConvidado;
  isVip: boolean;
  companionLimit: number;
  notes?: string;
  companions?: Acompanhante[];
};

/** Campos ausentes (undefined) ficam como estão. */
export type AlteracaoDoConvidado = {
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
  category?: CategoriaDoConvidado;
  isVip?: boolean;
  companionLimit?: number;
  notes?: string;
  deletedAt?: Date;
};

/** Agregado Convidado. Pertence a um evento e ocupa 1 + acompanhantes da lotação. */
export class Convidado {
  private constructor(private readonly dados: DadosDoConvidado) {}

  static reconstituir(dados: DadosDoConvidado): Convidado {
    return new Convidado(dados);
  }

  /** Lugares já reservados: cada convidado ocupa 1 + os acompanhantes dele. */
  static ocupacao(limitesDeAcompanhantes: readonly number[]): number {
    return limitesDeAcompanhantes.reduce((total, limite) => total + 1 + limite, 0);
  }

  static cadastrar(evento: Evento, ficha: FichaDoConvidado, ocupados: number): NovoConvidado {
    const acompanhantes = evento.acompanhantesPermitidos(ficha.companionLimit);
    evento.garantirLotacao(ocupados, 1 + acompanhantes);

    return {
      tenantId: evento.tenantId,
      eventId: evento.id,
      name: ficha.name,
      email: ficha.email,
      phone: ficha.phone,
      document: ficha.document,
      category: ficha.category ?? "COMMON",
      isVip: ficha.isVip ?? ficha.category === "VIP",
      companionLimit: acompanhantes,
      notes: ficha.notes,
      companions:
        ficha.companions && evento.permiteAcompanhantes
          ? ficha.companions.map((companion) => ({
              name: companion.name,
              document: companion.document
            }))
          : undefined
    };
  }

  get id(): string {
    return this.dados.id;
  }

  get tenantId(): string {
    return this.dados.tenantId;
  }

  get eventId(): string {
    return this.dados.eventId;
  }

  get nome(): string {
    return this.dados.name;
  }

  /** Na edição o limite de acompanhantes não é recontado contra a lotação. */
  alterar(evento: Evento, ficha: FichaDoConvidado): AlteracaoDoConvidado {
    return {
      name: ficha.name,
      email: ficha.email,
      phone: ficha.phone,
      document: ficha.document,
      category: ficha.category,
      isVip: ficha.isVip,
      companionLimit: evento.permiteAcompanhantes ? ficha.companionLimit : 0,
      notes: ficha.notes
    };
  }

  remover(agora: Date): AlteracaoDoConvidado {
    return { deletedAt: agora };
  }
}
