import { Inject, Injectable } from "@nestjs/common";
import { REGISTRAR_AUDITORIA, type Ator, type RegistrarAuditoria } from "../../../../shared/kernel";
import type { SituacaoDoEvento } from "../../domain/evento/evento";
import { EVENTO_REPOSITORY, type EventoRepository } from "../../domain/evento/evento.repository";
import { LocalizarEvento } from "./localizar-evento";

export type AlterarEventoComando = {
  name?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  locationName?: string;
  address?: string;
  capacity?: number;
  allowCompanions?: boolean;
  maxCompanionsPerGuest?: number;
  checkinStartsAt?: string;
  checkinEndsAt?: string;
  status?: SituacaoDoEvento;
};

@Injectable()
export class AlterarEvento {
  constructor(
    private readonly localizarEvento: LocalizarEvento,
    @Inject(EVENTO_REPOSITORY) private readonly eventos: EventoRepository,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(ator: Ator, id: string, comando: AlterarEventoComando) {
    const evento = await this.localizarEvento.executar(ator, id);
    const alteracao = evento.alterar({
      name: comando.name,
      description: comando.description,
      startsAt: comando.startsAt ? new Date(comando.startsAt) : undefined,
      endsAt: comando.endsAt ? new Date(comando.endsAt) : undefined,
      locationName: comando.locationName,
      address: comando.address,
      capacity: comando.capacity,
      allowCompanions: comando.allowCompanions,
      maxCompanionsPerGuest: comando.maxCompanionsPerGuest,
      checkinStartsAt: comando.checkinStartsAt ? new Date(comando.checkinStartsAt) : undefined,
      checkinEndsAt: comando.checkinEndsAt ? new Date(comando.checkinEndsAt) : undefined,
      status: comando.status
    });
    const event = await this.eventos.alterar(id, alteracao);

    await this.auditoria.registrar({
      tenantId: event.tenantId,
      actorId: ator.id,
      action: "event.update",
      entity: "event",
      entityId: event.id,
      metadata: comando
    });

    return event;
  }
}
