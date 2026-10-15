import { Inject, Injectable } from "@nestjs/common";
import {
  GERADOR_DE_TOKENS,
  Invalido,
  REGISTRAR_AUDITORIA,
  UNIDADE_DE_TRABALHO,
  type Ator,
  type GeradorDeTokens,
  type RegistrarAuditoria,
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

export type GerarConvitesComando = {
  guestIds?: string[];
  expiresAt?: string;
};

/**
 * Emite um convite novo para cada convidado escolhido. O convite anterior é
 * cancelado e a situação do convidado volta a PENDING na mesma transação.
 */
@Injectable()
export class GerarConvites {
  constructor(
    private readonly localizarEvento: LocalizarEvento,
    @Inject(CONVIDADO_REPOSITORY) private readonly convidados: ConvidadoRepository,
    @Inject(CONVITE_REPOSITORY) private readonly convites: ConviteRepository,
    @Inject(UNIDADE_DE_TRABALHO) private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    @Inject(GERADOR_DE_QR_CODE) private readonly qrCodes: GeradorDeQrCode,
    @Inject(ENDERECO_PUBLICO) private readonly enderecos: EnderecoPublico,
    @Inject(REGISTRAR_AUDITORIA) private readonly auditoria: RegistrarAuditoria
  ) {}

  async executar(ator: Ator, eventId: string, comando: GerarConvitesComando) {
    const evento = await this.localizarEvento.executar(ator, eventId);
    const convidados = await this.convidados.listarDoEvento(
      evento.id,
      evento.tenantId,
      comando.guestIds?.length ? comando.guestIds : undefined
    );

    if (!convidados.length) {
      throw new Invalido("No guests found for invitation generation");
    }

    const expiraEm = comando.expiresAt ? new Date(comando.expiresAt) : undefined;
    const invitations = [];
    for (const convidado of convidados) {
      const token = this.tokens.gerar(32);
      const publicUrl = this.enderecos.doConvite(token);
      const invitation = await this.unidadeDeTrabalho.executar(async () => {
        await this.convites.cancelarSubstituiveis(evento.id, evento.tenantId, convidado.id);
        const emitido = await this.convites.emitir(
          Convite.emitir(evento, convidado.id, { valor: token, hash: this.tokens.hash(token) }, expiraEm)
        );
        await this.convidados.marcarSituacaoDoConvite(convidado.id, "PENDING");
        return emitido;
      });

      invitations.push({
        invitationId: invitation.id,
        guestId: convidado.id,
        guestName: convidado.nome,
        token,
        publicUrl,
        qrCodeDataUrl: await this.qrCodes.gerar(publicUrl)
      });
    }

    await this.auditoria.registrar({
      tenantId: evento.tenantId,
      actorId: ator.id,
      action: "invitation.generate",
      entity: "invitation",
      metadata: { eventId, count: invitations.length }
    });

    return { count: invitations.length, invitations };
  }
}
