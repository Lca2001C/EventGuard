import { Inject, Injectable } from "@nestjs/common";
import {
  GERADOR_DE_TOKENS,
  NaoEncontrado,
  RELOGIO,
  UNIDADE_DE_TRABALHO,
  type GeradorDeTokens,
  type Relogio,
  type UnidadeDeTrabalho
} from "../../../../shared/kernel";
import {
  CONVIDADO_REPOSITORY,
  type ConvidadoRepository
} from "../../domain/convidado/convidado.repository";
import { Convite, type ConviteComEventoEConvidado } from "../../domain/convite/convite";
import { CONVITE_REPOSITORY, type ConviteRepository } from "../../domain/convite/convite.repository";
import {
  ENDERECO_PUBLICO,
  GERADOR_DE_QR_CODE,
  type EnderecoPublico,
  type GeradorDeQrCode
} from "../portas";

async function localizarPeloLink(
  convites: ConviteRepository,
  tokens: GeradorDeTokens,
  token: string,
  agora: Date
): Promise<ConviteComEventoEConvidado> {
  const invitation = await convites.buscarPorTokenHash(tokens.hash(token));

  if (!invitation || !Convite.reconstituir(invitation).acessivelEm(agora)) {
    throw new NaoEncontrado("Invitation not found");
  }

  return invitation;
}

/** Página pública do convite, aberta pelo convidado sem login. */
@Injectable()
export class ExibirConvitePublico {
  constructor(
    @Inject(CONVITE_REPOSITORY) private readonly convites: ConviteRepository,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    @Inject(GERADOR_DE_QR_CODE) private readonly qrCodes: GeradorDeQrCode,
    @Inject(ENDERECO_PUBLICO) private readonly enderecos: EnderecoPublico,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(token: string) {
    const invitation = await localizarPeloLink(this.convites, this.tokens, token, this.relogio.agora());
    const publicUrl = this.enderecos.doConvite(token);

    return {
      id: invitation.id,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      event: {
        id: invitation.event.id,
        name: invitation.event.name,
        startsAt: invitation.event.startsAt,
        endsAt: invitation.event.endsAt,
        locationName: invitation.event.locationName,
        address: invitation.event.address
      },
      guest: {
        name: invitation.guest.name,
        category: invitation.guest.category,
        companionLimit: invitation.guest.companionLimit
      },
      qrCodeDataUrl: await this.qrCodes.gerar(publicUrl)
    };
  }
}

@Injectable()
export class ConfirmarConvite {
  constructor(
    @Inject(CONVITE_REPOSITORY) private readonly convites: ConviteRepository,
    @Inject(CONVIDADO_REPOSITORY) private readonly convidados: ConvidadoRepository,
    @Inject(UNIDADE_DE_TRABALHO) private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    @Inject(GERADOR_DE_TOKENS) private readonly tokens: GeradorDeTokens,
    @Inject(RELOGIO) private readonly relogio: Relogio
  ) {}

  async executar(token: string) {
    const agora = this.relogio.agora();
    const invitation = await localizarPeloLink(this.convites, this.tokens, token, agora);
    const convite = Convite.reconstituir(invitation);
    const confirmacao = convite.confirmar(agora);

    await this.unidadeDeTrabalho.executar(async () => {
      await this.convites.alterar(convite.id, confirmacao);
      await this.convidados.marcarSituacaoDoConvite(convite.guestId, "CONFIRMED");
    });

    return { ok: true };
  }
}
