import { Inject, Injectable } from "@nestjs/common";
import { NaoEncontrado, type Ator } from "../../../../shared/kernel";
import { tenantDoEscopo } from "../escopo";
import {
  CONSULTAS_DA_RECEPCAO,
  type ConsultasDaRecepcao,
  type FiltroDeEventos
} from "../portas";

@Injectable()
export class ListarEventos {
  constructor(@Inject(CONSULTAS_DA_RECEPCAO) private readonly consultas: ConsultasDaRecepcao) {}

  executar(ator: Ator, filtro: FiltroDeEventos) {
    return this.consultas.listarEventos(tenantDoEscopo(ator), filtro);
  }
}

@Injectable()
export class DetalharEvento {
  constructor(@Inject(CONSULTAS_DA_RECEPCAO) private readonly consultas: ConsultasDaRecepcao) {}

  async executar(ator: Ator, id: string) {
    const event = await this.consultas.detalharEvento(id, tenantDoEscopo(ator));

    if (!event) {
      throw new NaoEncontrado("Event not found");
    }

    return event;
  }
}
