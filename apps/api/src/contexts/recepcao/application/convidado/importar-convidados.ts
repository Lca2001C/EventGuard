import { Inject, Injectable } from "@nestjs/common";
import {
  Invalido,
  REGISTRAR_AUDITORIA,
  type Ator,
  type RegistrarAuditoria
} from "../../../../shared/kernel";
import type { FichaDoConvidado } from "../../domain/convidado/convidado";
import type { ConvidadoComAcompanhantes } from "../../domain/convidado/convidado.repository";
import { LEITOR_DE_CSV_DE_CONVIDADOS, type LeitorDeCsvDeConvidados } from "../portas";
import { CadastrarConvidado } from "./cadastrar-convidado";

export type ImportarConvidadosComando = {
  csv?: string;
  rows?: FichaDoConvidado[];
};

/** Cada linha passa pelo mesmo cadastro (e pela mesma regra de lotação) do formulário. */
@Injectable()
export class ImportarConvidados {
  constructor(
    private readonly cadastrarConvidado: CadastrarConvidado,
    @Inject(LEITOR_DE_CSV_DE_CONVIDADOS) private readonly leitorDeCsv: LeitorDeCsvDeConvidados,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(ator: Ator, eventId: string, comando: ImportarConvidadosComando) {
    const fichas = comando.rows?.length ? comando.rows : this.leitorDeCsv.ler(comando.csv);
    if (!fichas.length) {
      throw new Invalido("No guests to import");
    }

    const created: ConvidadoComAcompanhantes[] = [];
    for (const ficha of fichas) {
      created.push(await this.cadastrarConvidado.executar(ator, eventId, ficha));
    }

    await this.auditoria.registrar({
      tenantId: created[0]?.tenantId,
      actorId: ator.id,
      action: "guest.import",
      entity: "guest",
      metadata: { eventId, count: created.length }
    });

    return { count: created.length, guests: created };
  }
}
