import { Module, forwardRef } from "@nestjs/common";
import { ABRIR_CONTA, ATUALIZAR_SITUACAO_DA_CONTA, CONSULTAR_CONTA } from "../../shared/kernel";
import { AssinaturaModule } from "../assinatura/assinatura.module";
import { AbrirContaNova, ConsultarResumoDaConta } from "./application/abrir-conta";
import {
  AlterarContaPeloAdmin,
  AlterarSituacaoDaConta,
  AtualizarMarca,
  CriarContaPeloAdmin,
  EnviarLogo
} from "./application/gerir-conta";
import { CONTA_REPOSITORY } from "./domain/conta.repository";
import { PrismaContaRepository } from "./infrastructure/prisma-conta.repository";
import { ContasController } from "./interface/http/contas.controller";

/**
 * Contexto Conta: tenant, slug, marca e situação. Único código autorizado a
 * alterar Tenant.status; Assinatura pede pela porta AtualizarSituacaoDaConta.
 *
 * Conta e Assinatura dependem uma da outra por portas (plano inicial numa
 * direção, situação da conta na outra), daí o forwardRef entre os módulos.
 */
@Module({
  imports: [forwardRef(() => AssinaturaModule)],
  controllers: [ContasController],
  providers: [
    { provide: CONTA_REPOSITORY, useClass: PrismaContaRepository },
    AbrirContaNova,
    ConsultarResumoDaConta,
    AlterarSituacaoDaConta,
    AtualizarMarca,
    EnviarLogo,
    CriarContaPeloAdmin,
    AlterarContaPeloAdmin,
    { provide: ABRIR_CONTA, useExisting: AbrirContaNova },
    { provide: CONSULTAR_CONTA, useExisting: ConsultarResumoDaConta },
    { provide: ATUALIZAR_SITUACAO_DA_CONTA, useExisting: AlterarSituacaoDaConta }
  ],
  exports: [ABRIR_CONTA, CONSULTAR_CONTA, ATUALIZAR_SITUACAO_DA_CONTA]
})
export class ContaModule {}
