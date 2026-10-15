import { Inject, Injectable } from "@nestjs/common";
import type { Ator } from "../../../shared/kernel";
import {
  agruparPorHora,
  indicadoresDoPainel,
  linhasDoRelatorio,
  paraCsv,
  separarPresenca,
  taxaDeComparecimento
} from "../domain/presenca";
import { EventoAutorizado } from "./evento-autorizado";
import {
  EXPORTADOR_DE_RELATORIO,
  LEITURAS_DA_CONSULTA,
  type ExportadorDeRelatorio,
  type LeiturasDaConsulta
} from "./portas";

@Injectable()
export class VerPainelDoEvento {
  constructor(
    private readonly eventoAutorizado: EventoAutorizado,
    @Inject(LEITURAS_DA_CONSULTA) private readonly leituras: LeiturasDaConsulta
  ) {}

  async executar(ator: Ator, eventId: string) {
    const event = await this.eventoAutorizado.carregar(ator, eventId);
    const painel = await this.leituras.painel(eventId, event.tenantId);

    return {
      event,
      ...indicadoresDoPainel(painel),
      invitationsByStatus: painel.invitationsByStatus,
      checkinsByHour: agruparPorHora(painel.horarios)
    };
  }
}

@Injectable()
export class GerarRelatorioDePresenca {
  constructor(
    private readonly eventoAutorizado: EventoAutorizado,
    @Inject(LEITURAS_DA_CONSULTA) private readonly leituras: LeiturasDaConsulta
  ) {}

  async executar(ator: Ator, eventId: string) {
    const event = await this.eventoAutorizado.carregar(ator, eventId);
    const { guests, entradasValidas, duplicateAttempts } = await this.leituras.relatorio(
      eventId,
      event.tenantId
    );
    const { present, absent } = separarPresenca(guests, entradasValidas);

    return {
      event,
      kpis: {
        totalGuests: guests.length,
        present: present.length,
        absent: absent.length,
        attendanceRate: taxaDeComparecimento(present.length, guests.length),
        duplicateAttempts
      },
      arrivalsByHour: agruparPorHora(entradasValidas.map((entrada) => entrada.checkedInAt)),
      present,
      absent
    };
  }
}

@Injectable()
export class ExportarRelatorio {
  constructor(
    private readonly gerarRelatorio: GerarRelatorioDePresenca,
    @Inject(EXPORTADOR_DE_RELATORIO) private readonly exportador: ExportadorDeRelatorio
  ) {}

  async csv(ator: Ator, eventId: string): Promise<string> {
    const report = await this.gerarRelatorio.executar(ator, eventId);
    return paraCsv(linhasDoRelatorio(report.present, report.absent));
  }

  async excel(ator: Ator, eventId: string): Promise<Buffer> {
    const report = await this.gerarRelatorio.executar(ator, eventId);
    return this.exportador.planilha(linhasDoRelatorio(report.present, report.absent));
  }

  async pdf(ator: Ator, eventId: string): Promise<Buffer> {
    const report = await this.gerarRelatorio.executar(ator, eventId);
    return this.exportador.pdf({ eventName: report.event.name, kpis: report.kpis, present: report.present });
  }
}

@Injectable()
export class AcompanharEntradas {
  constructor(
    private readonly eventoAutorizado: EventoAutorizado,
    @Inject(LEITURAS_DA_CONSULTA) private readonly leituras: LeiturasDaConsulta
  ) {}

  async listar(ator: Ator, eventId: string) {
    const event = await this.eventoAutorizado.carregar(ator, eventId);
    return this.leituras.entradasRecentes(eventId, event.tenantId);
  }

  /** Últimas entradas e onde ouvir as próximas pelo websocket. */
  async aoVivo(ator: Ator, eventId: string) {
    const recent = await this.listar(ator, eventId);
    return {
      websocketEvent: "checkin.created",
      room: `event:${eventId}`,
      recent
    };
  }
}

/** Visão da conta com plano e assinatura (tela de configurações e admin). */
@Injectable()
export class VerContas {
  constructor(@Inject(LEITURAS_DA_CONSULTA) private readonly leituras: LeiturasDaConsulta) {}

  daSessao(ator: Ator) {
    if (!ator.tenantId) {
      return null;
    }

    return this.leituras.contaDoTenant(ator.tenantId);
  }

  todas() {
    return this.leituras.contas();
  }
}
