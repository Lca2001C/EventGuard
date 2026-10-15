import { Module } from "@nestjs/common";
import { RecepcaoModule } from "../recepcao/recepcao.module";
import { EventoAutorizado } from "./application/evento-autorizado";
import {
  AcompanharEntradas,
  ExportarRelatorio,
  GerarRelatorioDePresenca,
  VerContas,
  VerPainelDoEvento
} from "./application/leituras";
import { EXPORTADOR_DE_RELATORIO, LEITURAS_DA_CONSULTA } from "./application/portas";
import { ExportadorExcelPdf } from "./infrastructure/exportador-de-relatorio";
import { PrismaLeiturasDaConsulta } from "./infrastructure/prisma-leituras-da-consulta";
import {
  ContasLidasController,
  PainelController,
  RelatoriosController
} from "./interface/http/consulta.controllers";

/**
 * Contexto Consulta: relatórios, painel ao vivo e as visões de conta que
 * cruzam contextos (tenant + plano + assinatura + contagens). Só leitura.
 * "Este ator pode ver este evento?" é respondido pela Recepção
 * (porta AutorizarAcessoAoEvento).
 */
@Module({
  imports: [RecepcaoModule],
  controllers: [PainelController, RelatoriosController, ContasLidasController],
  providers: [
    { provide: LEITURAS_DA_CONSULTA, useClass: PrismaLeiturasDaConsulta },
    { provide: EXPORTADOR_DE_RELATORIO, useClass: ExportadorExcelPdf },
    EventoAutorizado,
    VerPainelDoEvento,
    GerarRelatorioDePresenca,
    ExportarRelatorio,
    AcompanharEntradas,
    VerContas
  ]
})
export class ConsultaModule {}
