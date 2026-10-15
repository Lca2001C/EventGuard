import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parse } from "csv-parse/sync";
import QRCode from "qrcode";
import type { EnderecoPublico, GeradorDeQrCode, LeitorDeCsvDeConvidados } from "../application/portas";
import type { FichaDoConvidado } from "../domain/convidado/convidado";

export class QrCodeEmDataUrl implements GeradorDeQrCode {
  gerar(conteudo: string): Promise<string> {
    return QRCode.toDataURL(conteudo);
  }
}

@Injectable()
export class EnderecoPublicoDoFrontend implements EnderecoPublico {
  constructor(private readonly configService: ConfigService) {}

  doConvite(token: string): string {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    return `${frontendUrl.replace(/\/$/, "")}/invite/${token}`;
  }
}

/** Aceita cabeçalhos em inglês ou português (nome, telefone, categoria...). */
export class LeitorDeCsvParse implements LeitorDeCsvDeConvidados {
  ler(csv: string | undefined): FichaDoConvidado[] {
    if (!csv) {
      return [];
    }

    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Array<Record<string, string>>;

    return records.map((record) => ({
      name: record.name ?? record.nome,
      email: record.email,
      phone: record.phone ?? record.telefone,
      category: (record.category ?? record.categoria ?? "COMMON") as never,
      companionLimit: Number(record.companionLimit ?? record.acompanhantes ?? 0),
      notes: record.notes ?? record.observacoes
    }));
  }
}
