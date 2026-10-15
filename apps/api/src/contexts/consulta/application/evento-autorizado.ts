import { Inject, Injectable } from "@nestjs/common";
import {
  AUTORIZAR_ACESSO_AO_EVENTO,
  NaoEncontrado,
  Proibido,
  type Ator,
  type AutorizarAcessoAoEvento
} from "../../../shared/kernel";
import { LEITURAS_DA_CONSULTA, type EventoLido, type LeiturasDaConsulta } from "./portas";

/** Tenant que limita a leitura do ator; null quando ele vê todos (super admin). */
export function tenantDoEscopo(ator: Ator): string | null {
  if (ator.roles.includes("SUPER_ADMIN")) {
    return null;
  }

  if (!ator.tenantId) {
    throw new Proibido("Tenant scope is required");
  }

  return ator.tenantId;
}

/**
 * Porta de entrada de toda leitura por evento: a Recepção responde se o ator
 * pode ver o evento; a Consulta então lê o evento pelo próprio repositório.
 */
@Injectable()
export class EventoAutorizado {
  constructor(
    @Inject(AUTORIZAR_ACESSO_AO_EVENTO) private readonly acesso: AutorizarAcessoAoEvento,
    @Inject(LEITURAS_DA_CONSULTA) private readonly leituras: LeiturasDaConsulta
  ) {}

  async carregar(ator: Ator, eventId: string): Promise<EventoLido> {
    const tenantId = tenantDoEscopo(ator);
    const evento = (await this.acesso.podeVer(ator, eventId))
      ? await this.leituras.evento(eventId, tenantId)
      : null;

    if (!evento) {
      throw new NaoEncontrado("Event not found");
    }

    return evento;
  }
}
