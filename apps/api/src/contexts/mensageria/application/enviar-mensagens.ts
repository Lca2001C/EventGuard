import { Inject, Injectable } from "@nestjs/common";
import type {
  ConviteParaEnvio,
  EnviarConvite,
  EnviarRedefinicaoDeSenha,
  PedidoDeRedefinicaoDeSenha
} from "../../../shared/kernel";
import type {
  InvitationEmailJob,
  InvitationWhatsappJob,
  PasswordResetEmailJob
} from "../domain/mensagens";

/** Canais de entrega: fila quando há Redis, envio direto quando não há. */
export interface CanaisDeEnvio {
  emailDeRedefinicao(mensagem: PasswordResetEmailJob): Promise<void>;
  emailDeConvite(mensagem: InvitationEmailJob): Promise<void>;
  whatsappDeConvite(mensagem: InvitationWhatsappJob): Promise<void>;
}
export const CANAIS_DE_ENVIO = Symbol("CanaisDeEnvio");

/**
 * Implementa a porta EnviarConvite. Só escolhe os canais pelo contato do
 * convidado; a situação do convite é da Recepção.
 */
@Injectable()
export class EntregarConvite implements EnviarConvite {
  constructor(@Inject(CANAIS_DE_ENVIO) private readonly canais: CanaisDeEnvio) {}

  async enviar(convite: ConviteParaEnvio): Promise<void> {
    if (convite.email) {
      await this.canais.emailDeConvite({
        to: convite.email,
        guestName: convite.guestName,
        eventName: convite.eventName,
        eventDate: convite.eventDate,
        locationName: convite.locationName,
        publicUrl: convite.publicUrl,
        qrCodeDataUrl: convite.qrCodeDataUrl
      });
    }

    if (convite.telefone) {
      await this.canais.whatsappDeConvite({
        to: convite.telefone,
        guestName: convite.guestName,
        eventName: convite.eventName,
        eventDate: convite.eventDate,
        publicUrl: convite.publicUrl
      });
    }
  }
}

/** Implementa a porta EnviarRedefinicaoDeSenha. */
@Injectable()
export class EntregarRedefinicaoDeSenha implements EnviarRedefinicaoDeSenha {
  constructor(@Inject(CANAIS_DE_ENVIO) private readonly canais: CanaisDeEnvio) {}

  enviar(pedido: PedidoDeRedefinicaoDeSenha): Promise<void> {
    return this.canais.emailDeRedefinicao(pedido);
  }
}
