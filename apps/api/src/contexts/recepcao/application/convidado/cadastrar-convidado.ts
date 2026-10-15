import { Inject, Injectable } from "@nestjs/common";
import { REGISTRAR_AUDITORIA, type Ator, type RegistrarAuditoria } from "../../../../shared/kernel";
import { Convidado, type FichaDoConvidado } from "../../domain/convidado/convidado";
import {
  CONVIDADO_REPOSITORY,
  type ConvidadoRepository
} from "../../domain/convidado/convidado.repository";
import { LocalizarEvento } from "../evento/localizar-evento";

@Injectable()
export class CadastrarConvidado {
  constructor(
    private readonly localizarEvento: LocalizarEvento,
    @Inject(CONVIDADO_REPOSITORY) private readonly convidados: ConvidadoRepository,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(ator: Ator, eventId: string, ficha: FichaDoConvidado) {
    const evento = await this.localizarEvento.executar(ator, eventId);
    const ocupados = Convidado.ocupacao(await this.convidados.limitesDeAcompanhantes(evento.id));
    const guest = await this.convidados.cadastrar(Convidado.cadastrar(evento, ficha, ocupados));

    await this.auditoria.registrar({
      tenantId: evento.tenantId,
      actorId: ator.id,
      action: "guest.create",
      entity: "guest",
      entityId: guest.id,
      metadata: { eventId }
    });

    return guest;
  }
}
