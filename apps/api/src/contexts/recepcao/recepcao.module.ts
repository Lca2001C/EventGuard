import { Module } from "@nestjs/common";
import { AUTORIZAR_ACESSO_AO_EVENTO, MEDIR_USO } from "../../shared/kernel";
import { AlterarConvidado, RemoverConvidado } from "./application/convidado/alterar-convidado";
import { CadastrarConvidado } from "./application/convidado/cadastrar-convidado";
import { ImportarConvidados } from "./application/convidado/importar-convidados";
import { ListarConvidados } from "./application/convidado/listar-convidados";
import { ConfirmarConvite, ExibirConvitePublico } from "./application/convite/convite-publico";
import { EnviarConvites } from "./application/convite/enviar-convites";
import { GerarConvites } from "./application/convite/gerar-convites";
import { RegistrarEntradaManual } from "./application/entrada/registrar-entrada-manual";
import { RegistrarTentativa } from "./application/entrada/registrar-tentativa";
import { ValidarQrCode } from "./application/entrada/validar-qr-code";
import { AbrirEvento } from "./application/evento/abrir-evento";
import { AlterarEvento } from "./application/evento/alterar-evento";
import { CancelarEvento } from "./application/evento/cancelar-evento";
import { DetalharEvento, ListarEventos } from "./application/evento/consultar-eventos";
import { LocalizarEvento } from "./application/evento/localizar-evento";
import { VerificarAcessoAoEvento } from "./application/evento/verificar-acesso-ao-evento";
import {
  CONSULTAS_DA_RECEPCAO,
  ENDERECO_PUBLICO,
  GERADOR_DE_QR_CODE,
  LEITOR_DE_CSV_DE_CONVIDADOS
} from "./application/portas";
import { CONVIDADO_REPOSITORY } from "./domain/convidado/convidado.repository";
import { CONVITE_REPOSITORY } from "./domain/convite/convite.repository";
import { ENTRADA_REPOSITORY } from "./domain/entrada/entrada.repository";
import { EVENTO_REPOSITORY } from "./domain/evento/evento.repository";
import {
  EnderecoPublicoDoFrontend,
  LeitorDeCsvParse,
  QrCodeEmDataUrl
} from "./infrastructure/adaptadores";
import { PrismaConsultasDaRecepcao } from "./infrastructure/prisma-consultas-da-recepcao";
import { PrismaConvidadoRepository } from "./infrastructure/prisma-convidado.repository";
import { PrismaConviteRepository } from "./infrastructure/prisma-convite.repository";
import { PrismaEntradaRepository } from "./infrastructure/prisma-entrada.repository";
import { PrismaEventoRepository } from "./infrastructure/prisma-evento.repository";
import { PrismaMedicaoDeUso } from "./infrastructure/prisma-medicao-de-uso";
import { ConvidadosController } from "./interface/http/convidados.controller";
import { ConvitesController } from "./interface/http/convites.controller";
import { EntradasController } from "./interface/http/entradas.controller";
import { EventosController } from "./interface/http/eventos.controller";

/**
 * Contexto Recepção: núcleo do produto. Evento, Convidado, Convite e Entrada
 * compartilham transação e invariantes (lotação, janela, QR de uso único,
 * convidado do mesmo evento). EnviarConvite (Mensageria) e as portas da
 * plataforma chegam pelos módulos globais. Exporta AutorizarAcessoAoEvento
 * (para Consulta) e MedirUso (para Assinatura).
 */
@Module({
  controllers: [EventosController, ConvidadosController, ConvitesController, EntradasController],
  providers: [
    { provide: EVENTO_REPOSITORY, useClass: PrismaEventoRepository },
    { provide: CONVIDADO_REPOSITORY, useClass: PrismaConvidadoRepository },
    { provide: CONVITE_REPOSITORY, useClass: PrismaConviteRepository },
    { provide: ENTRADA_REPOSITORY, useClass: PrismaEntradaRepository },
    { provide: CONSULTAS_DA_RECEPCAO, useClass: PrismaConsultasDaRecepcao },
    { provide: GERADOR_DE_QR_CODE, useClass: QrCodeEmDataUrl },
    { provide: ENDERECO_PUBLICO, useClass: EnderecoPublicoDoFrontend },
    { provide: LEITOR_DE_CSV_DE_CONVIDADOS, useClass: LeitorDeCsvParse },
    LocalizarEvento,
    ListarEventos,
    DetalharEvento,
    AbrirEvento,
    AlterarEvento,
    CancelarEvento,
    ListarConvidados,
    CadastrarConvidado,
    ImportarConvidados,
    AlterarConvidado,
    RemoverConvidado,
    GerarConvites,
    EnviarConvites,
    ExibirConvitePublico,
    ConfirmarConvite,
    RegistrarTentativa,
    ValidarQrCode,
    RegistrarEntradaManual,
    VerificarAcessoAoEvento,
    { provide: AUTORIZAR_ACESSO_AO_EVENTO, useExisting: VerificarAcessoAoEvento },
    { provide: MEDIR_USO, useClass: PrismaMedicaoDeUso }
  ],
  exports: [AUTORIZAR_ACESSO_AO_EVENTO, MEDIR_USO]
})
export class RecepcaoModule {}
