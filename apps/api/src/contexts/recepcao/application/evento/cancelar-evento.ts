import { Inject, Injectable } from "@nestjs/common";
import {
  REGISTRAR_AUDITORIA,
  RELOGIO,
  type Ator,
  type RegistrarAuditoria,
  type Relogio
} from "../../../../shared/kernel";
import { EVENTO_REPOSITORY, type EventoRepository } from "../../domain/evento/evento.repository";
import { LocalizarEvento } from "./localizar-evento";

@Injectable()
export class CancelarEvento {
  constructor(
    private readonly localizarEvento: LocalizarEvento,
    @Inject(EVENTO_REPOSITORY) private readonly eventos: EventoRepository,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(ator: Ator, id: string) {
    const evento = await this.localizarEvento.executar(ator, id);
    const removed = await this.eventos.alterar(id, evento.cancelar(this.relogio.agora()));

    await this.auditoria.registrar({
      tenantId: evento.tenantId,
      actorId: ator.id,
      action: "event.delete",
      entity: "event",
      entityId: evento.id
    });

    return removed;
  }
}
