import { Inject, Injectable } from "@nestjs/common";
import {
  ENVIAR_CONVITE,
  GERADOR_DE_TOKENS,
  REGISTRAR_AUDITORIA,
  RELOGIO,
  UNIDADE_DE_TRABALHO,
  type Ator,
  type EnviarConvite,
  type GeradorDeTokens,
  type RegistrarAuditoria,
  type Relogio,
  type UnidadeDeTrabalho
} from "../../../../shared/kernel";
import {
  CONVIDADO_REPOSITORY,
  type ConvidadoRepository
} from "../../domain/convidado/convidado.repository";
import { Convite } from "../../domain/convite/convite";
import { CONVITE_REPOSITORY, type ConviteRepository } from "../../domain/convite/convite.repository";
import { LocalizarEvento } from "../evento/localizar-evento";
import {
  ENDERECO_PUBLICO,
  GERADOR_DE_QR_CODE,
  type EnderecoPublico,
  type GeradorDeQrCode
} from "../portas";

export type EnviarConvitesComando = {
  guestIds?: string[];
};

/**
 * Disparo dos convites pendentes ou já enviados. A Recepção persiste o envio
 * (token novo, SENT) e só então pede à Mensageria que entregue o convite.
 */
@Injectable()
export class EnviarConvites {
  constructor(
    private readonly localizarEvento: LocalizarEvento,
    @Inject(CONVIDADO_REPOSITORY) private readonly convidados: ConvidadoRepository,
    @Inject(CONVITE_REPOSITORY) private readonly convites: ConviteRepository,
    @Inject(UNIDADE_DE_TRABALHO) private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    @Inject(GERADOR_DE_QR_CODE) private readonly qrCodes: GeradorDeQrCode,
    @Inject(ENDERECO_PUBLICO) private readonly enderecos: EnderecoPublico,
    @Inject(ENVIAR_CONVITE) private readonly enviarConvite: EnviarConvite,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(ator: Ator, eventId: string, comando: EnviarConvitesComando) {
    const evento = await this.localizarEvento.executar(ator, eventId);
    const enviaveis = await this.convites.listarEnviaveis(
      evento.id,
      evento.tenantId,
      comando.guestIds?.length ? comando.guestIds : undefined
    );
    const eventDate = evento.inicio.toLocaleString("pt-BR");
    let dispatched = 0;

    for (const enviavel of enviaveis) {
      const token = this.tokens.gerar(32);
      const publicUrl = this.enderecos.doConvite(token);
      const qrCodeDataUrl = await this.qrCodes.gerar(publicUrl);
      const convite = Convite.reconstituir(enviavel);

      await this.unidadeDeTrabalho.executar(async () => {
        await this.convites.alterar(
          convite.id,
          convite.enviar({ valor: token, hash: this.tokens.hash(token) }, this.relogio.agora())
        );
        await this.convidados.marcarSituacaoDoConvite(convite.guestId, "SENT");
      });

      await this.enviarConvite.enviar({
        email: enviavel.guest.email,
        telefone: enviavel.guest.phone,
        guestName: enviavel.guest.name,
        eventName: evento.nome,
        eventDate,
        locationName: evento.local,
        publicUrl,
        qrCodeDataUrl
      });

      dispatched += 1;
    }

    await this.auditoria.registrar({
      tenantId: evento.tenantId,
      actorId: ator.id,
      action: "invitation.send",
      entity: "invitation",
      metadata: { eventId, count: dispatched }
    });

    return { count: dispatched };
  }
}
