import { Inject, Injectable } from "@nestjs/common";
import {
  PUBLICAR_ENTRADA,
  REGISTRAR_AUDITORIA,
  RELOGIO,
  type PublicarEntrada,
  type RegistrarAuditoria,
  type Relogio
} from "../../../../shared/kernel";
import type { DecisaoDeEntrada } from "../../domain/avaliar-entrada/avaliar-entrada";
import { Dispositivo, Entrada } from "../../domain/entrada/entrada";
import { ENTRADA_REPOSITORY, type EntradaRepository } from "../../domain/entrada/entrada.repository";

export type Tentativa = {
  tenantId: string;
  eventId: string;
  guestId?: string;
  invitationId?: string;
  operatorId: string;
  tokenHash?: string;
  companionCount: number;
  deviceFingerprint?: string;
  deviceName?: string;
};

/**
 * Registra uma leitura de QR que não virou entrada (negada, duplicada, fora
 * da janela, outro evento): grava, audita e avisa o painel.
 */
@Injectable()
export class RegistrarTentativa {
  constructor(
    @Inject(ENTRADA_REPOSITORY) private readonly entradas: EntradaRepository,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria,
    @Inject(PUBLICAR_ENTRADA) private readonly publicarEntrada: PublicarEntrada,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(tentativa: Tentativa, decisao: DecisaoDeEntrada) {
    const deviceId = await this.identificarDispositivo(
      tentativa.tenantId,
      tentativa.deviceFingerprint,
      tentativa.deviceName
    );
    const checkin = await this.entradas.registrar(
      Entrada.registrar(
        {
          tenantId: tentativa.tenantId,
          eventId: tentativa.eventId,
          guestId: tentativa.guestId,
          invitationId: tentativa.invitationId,
          operatorId: tentativa.operatorId,
          tokenHash: tentativa.tokenHash,
          companionCount: tentativa.companionCount,
          deviceId
        },
        decisao
      )
    );

    await this.auditoria.registrar({
      tenantId: tentativa.tenantId,
      actorId: tentativa.operatorId,
      action: "checkin.attempt",
      entity: "checkin",
      entityId: checkin.id,
      metadata: { result: decisao.result, reason: decisao.reason }
    });

    this.publicarEntrada.publicar(tentativa.eventId, checkin);

    return { result: decisao.result, reason: decisao.reason, checkin };
  }

  async identificarDispositivo(
    tenantId: string,
    fingerprint: string | undefined,
    nome: string | undefined
  ): Promise<string | undefined> {
    const dispositivo = Dispositivo.identificar(fingerprint, nome);
    if (!dispositivo) {
      return undefined;
    }

    return this.entradas.registrarDispositivo(tenantId, dispositivo, this.relogio.agora());
  }
}
