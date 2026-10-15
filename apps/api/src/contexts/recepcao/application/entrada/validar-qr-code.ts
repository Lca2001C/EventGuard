import { Inject, Injectable } from "@nestjs/common";
import {
  GERADOR_DE_TOKENS,
  PUBLICAR_ENTRADA,
  REGISTRAR_AUDITORIA,
  RELOGIO,
  UNIDADE_DE_TRABALHO,
  type Ator,
  type GeradorDeTokens,
  type PublicarEntrada,
  type RegistrarAuditoria,
  type Relogio,
  type UnidadeDeTrabalho
} from "../../../../shared/kernel";
import {
  ENTRADA_APROVADA,
  QR_JA_UTILIZADO,
  avaliarEntrada
} from "../../domain/avaliar-entrada/avaliar-entrada";
import {
  CONVIDADO_REPOSITORY,
  type ConvidadoRepository
} from "../../domain/convidado/convidado.repository";
import { Convite } from "../../domain/convite/convite";
import { CONVITE_REPOSITORY, type ConviteRepository } from "../../domain/convite/convite.repository";
import { Entrada } from "../../domain/entrada/entrada";
import { ENTRADA_REPOSITORY, type EntradaRepository } from "../../domain/entrada/entrada.repository";
import { LocalizarEvento } from "../evento/localizar-evento";
import { RegistrarTentativa } from "./registrar-tentativa";

export type ValidarQrCodeComando = {
  token: string;
  eventId?: string;
  deviceFingerprint?: string;
  deviceName?: string;
  companionCount?: number;
};

/**
 * Leitura do QR Code na portaria. A política AvaliarEntrada decide; se aprovar,
 * convite, convidado e entrada são gravados numa só transação e o painel é
 * avisado depois do commit.
 */
@Injectable()
export class ValidarQrCode {
  constructor(
    private readonly localizarEvento: LocalizarEvento,
    private readonly registrarTentativa: RegistrarTentativa,
    @Inject(CONVITE_REPOSITORY) private readonly convites: ConviteRepository,
    @Inject(CONVIDADO_REPOSITORY) private readonly convidados: ConvidadoRepository,
    @Inject(ENTRADA_REPOSITORY) private readonly entradas: EntradaRepository,
    @Inject(UNIDADE_DE_TRABALHO) private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria,
    @Inject(PUBLICAR_ENTRADA) private readonly publicarEntrada: PublicarEntrada,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(ator: Ator, comando: ValidarQrCodeComando) {
    const tokenHash = this.tokens.hash(comando.token);
    const invitation = await this.convites.buscarPorTokenHash(tokenHash);
    const agora = this.relogio.agora();
    const decisao = avaliarEntrada(invitation, comando.eventId, agora);
    const companionCount = comando.companionCount ?? 0;

    if (!invitation) {
      if (!comando.eventId) {
        await this.auditoria.registrar({
          actorId: ator.id,
          tenantId: ator.tenantId,
          action: "checkin.invalid",
          entity: "checkin",
          metadata: { result: decisao.result, reason: decisao.reason }
        });

        return { result: decisao.result, reason: decisao.reason };
      }

      const evento = await this.localizarEvento.executar(ator, comando.eventId);
      return this.registrarTentativa.executar(
        {
          tenantId: evento.tenantId,
          eventId: evento.id,
          operatorId: ator.id,
          tokenHash,
          companionCount,
          deviceFingerprint: comando.deviceFingerprint,
          deviceName: comando.deviceName
        },
        decisao
      );
    }

    const origem = {
      tenantId: invitation.tenantId,
      eventId: invitation.eventId,
      guestId: invitation.guestId,
      invitationId: invitation.id,
      operatorId: ator.id,
      tokenHash,
      companionCount
    };

    if (decisao.result !== ENTRADA_APROVADA.result) {
      return this.registrarTentativa.executar(
        { ...origem, deviceFingerprint: comando.deviceFingerprint, deviceName: comando.deviceName },
        decisao
      );
    }

    const deviceId = await this.registrarTentativa.identificarDispositivo(
      invitation.tenantId,
      comando.deviceFingerprint,
      comando.deviceName
    );
    const convite = Convite.reconstituir(invitation);
    const checkin = await this.unidadeDeTrabalho.executar(async () => {
      const usado = await this.convites.registrarEntradaSeNaoUsado(
        convite.id,
        convite.registrarEntrada(agora)
      );

      if (!usado) {
        // Outra leitura do mesmo QR venceu a corrida.
        return this.entradas.registrar(Entrada.registrar({ ...origem, deviceId }, QR_JA_UTILIZADO));
      }

      await this.convidados.marcarSituacaoDoConvite(convite.guestId, "CHECKED_IN");
      return this.entradas.registrarDetalhada(Entrada.registrar({ ...origem, deviceId }, decisao));
    });

    await this.auditoria.registrar({
      tenantId: invitation.tenantId,
      actorId: ator.id,
      action: "checkin.validate",
      entity: "checkin",
      entityId: checkin.id,
      metadata: { result: checkin.result, eventId: invitation.eventId }
    });

    this.publicarEntrada.publicar(invitation.eventId, checkin);

    return { result: checkin.result, reason: checkin.reason, checkin };
  }
}
