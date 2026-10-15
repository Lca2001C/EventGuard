import { Inject, Injectable } from "@nestjs/common";
import { NaoEncontrado, type Ator } from "../../../../shared/kernel";
import type { Evento } from "../../domain/evento/evento";
import { EVENTO_REPOSITORY, type EventoRepository } from "../../domain/evento/evento.repository";
import { tenantDoEscopo } from "../escopo";

/** Carrega um evento que o ator pode operar; 404 quando não existe para ele. */
@Injectable()
export class LocalizarEvento {
  constructor(@Inject(EVENTO_REPOSITORY) private readonly eventos: EventoRepository) {}

  async executar(ator: Ator, eventId: string): Promise<Evento> {
    const evento = await this.eventos.buscarNoEscopo(eventId, tenantDoEscopo(ator));

    if (!evento) {
      throw new NaoEncontrado("Event not found");
    }

    return evento;
  }
}
