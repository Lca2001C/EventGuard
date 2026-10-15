import { Inject, Injectable } from "@nestjs/common";
import {
  NaoEncontrado,
  REGISTRAR_AUDITORIA,
  RELOGIO,
  type Ator,
  type RegistrarAuditoria,
  type Relogio
} from "../../../../shared/kernel";
import type { Convidado, FichaDoConvidado } from "../../domain/convidado/convidado";
import {
  CONVIDADO_REPOSITORY,
  type ConvidadoRepository
} from "../../domain/convidado/convidado.repository";
import { EVENTO_REPOSITORY, type EventoRepository } from "../../domain/evento/evento.repository";

async function localizarConvidado(
  convidados: ConvidadoRepository,
  ator: Ator,
  id: string
): Promise<Convidado> {
  const tenantId = ator.roles.includes("SUPER_ADMIN") ? undefined : ator.tenantId ?? undefined;
  const convidado = await convidados.buscar(id, tenantId);

  if (!convidado) {
    throw new NaoEncontrado("Guest not found");
  }

  return convidado;
}

@Injectable()
export class AlterarConvidado {
  constructor(
    @Inject(CONVIDADO_REPOSITORY) private readonly convidados: ConvidadoRepository,
    @Inject(EVENTO_REPOSITORY) private readonly eventos: EventoRepository,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(ator: Ator, id: string, ficha: FichaDoConvidado) {
    const convidado = await localizarConvidado(this.convidados, ator, id);
    const evento = await this.eventos.obterPorId(convidado.eventId);
    const updated = await this.convidados.alterar(id, convidado.alterar(evento, ficha));

    await this.auditoria.registrar({
      tenantId: convidado.tenantId,
      actorId: ator.id,
      action: "guest.update",
      entity: "guest",
      entityId: convidado.id,
      metadata: ficha
    });

    return updated;
  }
}

@Injectable()
export class RemoverConvidado {
  constructor(
    @Inject(CONVIDADO_REPOSITORY) private readonly convidados: ConvidadoRepository,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(ator: Ator, id: string) {
    const convidado = await localizarConvidado(this.convidados, ator, id);
    const removed = await this.convidados.alterar(id, convidado.remover(this.relogio.agora()));

    await this.auditoria.registrar({
      tenantId: convidado.tenantId,
      actorId: ator.id,
      action: "guest.delete",
      entity: "guest",
      entityId: convidado.id
    });

    return removed;
  }
}
