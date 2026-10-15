import { Inject, Injectable } from "@nestjs/common";
import type { Ator } from "../../../../shared/kernel";
import { LocalizarEvento } from "../evento/localizar-evento";
import {
  CONSULTAS_DA_RECEPCAO,
  type ConsultasDaRecepcao,
  type FiltroDeConvidados
} from "../portas";

@Injectable()
export class ListarConvidados {
  constructor(
    private readonly localizarEvento: LocalizarEvento,
    @Inject(CONSULTAS_DA_RECEPCAO) private readonly consultas: ConsultasDaRecepcao
  ) {}

  async executar(ator: Ator, eventId: string, filtro: FiltroDeConvidados) {
    const evento = await this.localizarEvento.executar(ator, eventId);
    return this.consultas.listarConvidados(eventId, evento.tenantId, filtro);
  }
}
