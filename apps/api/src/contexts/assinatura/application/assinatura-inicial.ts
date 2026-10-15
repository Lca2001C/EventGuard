import { Inject, Injectable } from "@nestjs/common";
import { RELOGIO, type AssinaturaInicial, type Relogio } from "../../../shared/kernel";
import { Assinatura, PLANO_INICIAL } from "../domain/assinatura";
import {
  ASSINATURA_REPOSITORY,
  PLANO_REPOSITORY,
  type AssinaturaRepository,
  type PlanoRepository
} from "../domain/assinatura.repository";

/** Implementa a porta AssinaturaInicial: plano de entrada e período de teste. */
@Injectable()
export class IniciarAssinatura implements AssinaturaInicial {
  constructor(
    @Inject(PLANO_REPOSITORY) private readonly planos: PlanoRepository,
    @Inject(ASSINATURA_REPOSITORY) private readonly assinaturas: AssinaturaRepository,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async planoInicial(): Promise<{ id: string } | null> {
    return this.planos.buscarPorCodigo(PLANO_INICIAL);
  }

  async iniciarPeriodoDeTeste(tenantId: string, planId: string): Promise<void> {
    await this.assinaturas.criar(Assinatura.iniciarTeste(tenantId, planId, this.relogio.agora()));
  }
}
