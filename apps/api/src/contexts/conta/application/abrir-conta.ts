import { Inject, Injectable } from "@nestjs/common";
import type {
  AberturaDeConta,
  AbrirConta,
  ConsultarConta,
  ResumoDaConta
} from "../../../shared/kernel";
import { Conta, proximoSlug, slugDe, type DadosDaConta } from "../domain/conta";
import { CONTA_REPOSITORY, type ContaRepository } from "../domain/conta.repository";

/**
 * Abre uma conta em TRIAL com slug único. Implementa a porta AbrirConta
 * (cadastro público, na transação da Identidade) e serve à criação pelo admin.
 */
@Injectable()
export class AbrirContaNova implements AbrirConta {
  constructor(@Inject(CONTA_REPOSITORY) private readonly contas: ContaRepository) {}

  async abrir(abertura: AberturaDeConta): Promise<DadosDaConta> {
    const slug = await this.slugUnico(slugDe(abertura.nome));

    return this.contas.criar(
      Conta.abrir({
        nome: abertura.nome,
        slug,
        logoUrl: abertura.logoUrl,
        primaryColor: abertura.primaryColor,
        planId: abertura.planId
      })
    );
  }

  private async slugUnico(base: string): Promise<string> {
    let tentativa = 1;
    while (await this.contas.slugEmUso(proximoSlug(base, tentativa))) {
      tentativa += 1;
    }

    return proximoSlug(base, tentativa);
  }
}

/** Implementa a porta ConsultarConta: o resumo que a sessão mostra. */
@Injectable()
export class ConsultarResumoDaConta implements ConsultarConta {
  constructor(@Inject(CONTA_REPOSITORY) private readonly contas: ContaRepository) {}

  resumo(tenantId: string): Promise<ResumoDaConta | null> {
    return this.contas.resumo(tenantId);
  }
}
