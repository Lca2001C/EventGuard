import { Inject, Injectable } from "@nestjs/common";
import {
  Invalido,
  PUBLICAR_ENTRADA,
  REGISTRAR_AUDITORIA,
  UNIDADE_DE_TRABALHO,
  type Ator,
  type PublicarEntrada,
  type RegistrarAuditoria,
  type UnidadeDeTrabalho
} from "../../../../shared/kernel";
import { avaliarEntradaManual } from "../../domain/avaliar-entrada/avaliar-entrada";
import {
  CONVIDADO_REPOSITORY,
  type ConvidadoRepository
} from "../../domain/convidado/convidado.repository";
import { Entrada } from "../../domain/entrada/entrada";
import { ENTRADA_REPOSITORY, type EntradaRepository } from "../../domain/entrada/entrada.repository";
import { LocalizarEvento } from "../evento/localizar-evento";

export type EntradaManualComando = {
  eventId: string;
  guestId: string;
  companionCount: number;
  reason: string;
};

/** Entrada liberada pela recepção sem QR, para um convidado do próprio evento. */
@Injectable()
export class RegistrarEntradaManual {
  constructor(
    private readonly localizarEvento: LocalizarEvento,
    @Inject(CONVIDADO_REPOSITORY) private readonly convidados: ConvidadoRepository,
    @Inject(ENTRADA_REPOSITORY) private readonly entradas: EntradaRepository,
    @Inject(UNIDADE_DE_TRABALHO) private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria,
    @Inject(PUBLICAR_ENTRADA) private readonly publicarEntrada: PublicarEntrada
  ) {}

  async executar(ator: Ator, comando: EntradaManualComando) {
    const evento = await this.localizarEvento.executar(ator, comando.eventId);
    const convidado = await this.convidados.buscarDoEvento(comando.guestId, evento.id, evento.tenantId);

    if (!convidado) {
      throw new Invalido("Guest does not belong to this event");
    }

    const { decisao, checkin } = await this.unidadeDeTrabalho.executar(async () => {
      const jaEntrou = await this.entradas.temPresenca(evento.id, convidado.id);
      const decisao = avaliarEntradaManual(jaEntrou, comando.reason);
      const checkin = await this.entradas.registrarDetalhada(
        Entrada.registrar(
          {
            tenantId: evento.tenantId,
            eventId: evento.id,
            guestId: convidado.id,
            operatorId: ator.id,
            companionCount: comando.companionCount
          },
          decisao
        )
      );

      if (decisao.result === "MANUAL") {
        await this.convidados.marcarSituacaoDoConvite(convidado.id, "CHECKED_IN");
      }

      return { decisao, checkin };
    });

    await this.auditoria.registrar({
      tenantId: evento.tenantId,
      actorId: ator.id,
      action: "checkin.manual",
      entity: "checkin",
      entityId: checkin.id,
      metadata:
        decisao.result === "DUPLICATE"
          ? { result: decisao.result, reason: decisao.reason }
          : { reason: comando.reason }
    });

    this.publicarEntrada.publicar(evento.id, checkin);

    return { result: decisao.result, reason: decisao.reason, checkin };
  }
}
