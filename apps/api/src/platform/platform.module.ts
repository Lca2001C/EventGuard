import { Global, Module } from "@nestjs/common";
import {
  ARMAZENAR_ARQUIVO,
  GERADOR_DE_IDS,
  GERADOR_DE_TOKENS,
  PUBLICAR_ENTRADA,
  REGISTRAR_AUDITORIA,
  RELOGIO,
  UNIDADE_DE_TRABALHO
} from "../shared/kernel";
import { PrismaAuditoria } from "./audit/prisma-auditoria";
import { RelogioDoSistema } from "./clock/relogio-do-sistema";
import { GeradorDeTokensSeguros, GeradorDeUuid } from "./ids/geradores";
import { PrismaModule } from "./prisma/prisma.module";
import { PrismaUnidadeDeTrabalho } from "./prisma/transacao";
import { DashboardGateway } from "./realtime/dashboard.gateway";
import { PublicarEntradaPorSocket } from "./realtime/publicar-entrada.socket";
import { StorageService } from "./storage/storage.service";

/**
 * Plataforma técnica compartilhada pelos contextos: banco, transação,
 * auditoria, relógio, ids, storage e tempo real. Cada recurso é exposto pelo
 * token da porta declarada no kernel; os contextos não conhecem as classes.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    DashboardGateway,
    StorageService,
    { provide: UNIDADE_DE_TRABALHO, useClass: PrismaUnidadeDeTrabalho },
    { provide: REGISTRAR_AUDITORIA, useClass: PrismaAuditoria },
    { provide: RELOGIO, useClass: RelogioDoSistema },
    { provide: GERADOR_DE_IDS, useClass: GeradorDeUuid },
    { provide: GERADOR_DE_TOKENS, useClass: GeradorDeTokensSeguros },
    { provide: ARMAZENAR_ARQUIVO, useExisting: StorageService },
    { provide: PUBLICAR_ENTRADA, useClass: PublicarEntradaPorSocket }
  ],
  exports: [
    PrismaModule,
    DashboardGateway,
    StorageService,
    UNIDADE_DE_TRABALHO,
    REGISTRAR_AUDITORIA,
    RELOGIO,
    GERADOR_DE_IDS,
    GERADOR_DE_TOKENS,
    ARMAZENAR_ARQUIVO,
    PUBLICAR_ENTRADA
  ]
})
export class PlatformModule {}
