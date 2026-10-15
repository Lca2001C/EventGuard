import { Inject, Injectable } from "@nestjs/common";
import type { Ator, AutorizarAcessoAoEvento } from "../../../../shared/kernel";
import { EVENTO_REPOSITORY, type EventoRepository } from "../../domain/evento/evento.repository";

/**
 * Implementa a porta AutorizarAcessoAoEvento para os outros contextos:
 * responde só sim ou não, sem expor o evento.
 */
@Injectable()
export class VerificarAcessoAoEvento implements AutorizarAcessoAoEvento {
  constructor(@Inject(EVENTO_REPOSITORY) private readonly eventos: EventoRepository) {}

  async podeVer(ator: Ator, eventId: string): Promise<boolean> {
    const superAdmin = ator.roles.includes("SUPER_ADMIN");
    if (!superAdmin && !ator.tenantId) {
      return false;
    }

    const evento = await this.eventos.buscarNoEscopo(eventId, superAdmin ? null : ator.tenantId);
    return evento !== null;
  }
}
