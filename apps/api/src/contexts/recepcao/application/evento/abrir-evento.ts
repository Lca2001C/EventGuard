import { Inject, Injectable } from "@nestjs/common";
import { REGISTRAR_AUDITORIA, type Ator, type RegistrarAuditoria } from "../../../../shared/kernel";
import { Evento } from "../../domain/evento/evento";
import { EVENTO_REPOSITORY, type EventoRepository } from "../../domain/evento/evento.repository";
import { exigirTenant } from "../escopo";

export type AbrirEventoComando = {
  name: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
  address?: string;
  capacity: number;
  allowCompanions: boolean;
  maxCompanionsPerGuest: number;
  checkinStartsAt?: string;
  checkinEndsAt?: string;
};

@Injectable()
export class AbrirEvento {
  constructor(
    @Inject(EVENTO_REPOSITORY) private readonly eventos: EventoRepository,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(ator: Ator, comando: AbrirEventoComando) {
    const tenantId = exigirTenant(ator);
    const novo = Evento.abrir({
      tenantId,
      createdById: ator.id,
      name: comando.name,
      description: comando.description,
      startsAt: new Date(comando.startsAt),
      endsAt: new Date(comando.endsAt),
      locationName: comando.locationName,
      address: comando.address,
      capacity: comando.capacity,
      allowCompanions: comando.allowCompanions,
      maxCompanionsPerGuest: comando.maxCompanionsPerGuest,
      checkinStartsAt: comando.checkinStartsAt ? new Date(comando.checkinStartsAt) : undefined,
      checkinEndsAt: comando.checkinEndsAt ? new Date(comando.checkinEndsAt) : undefined
    });
    const event = await this.eventos.criar(novo);

    await this.auditoria.registrar({
      tenantId,
      actorId: ator.id,
      action: "event.create",
      entity: "event",
      entityId: event.id
    });

    return event;
  }
}
