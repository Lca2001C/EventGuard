// Portas implementadas por Mensageria.

export type ConviteParaEnvio = {
  email?: string | null;
  telefone?: string | null;
  guestName: string;
  eventName: string;
  eventDate: string;
  locationName: string;
  publicUrl: string;
  qrCodeDataUrl: string;
};

/** Recepção chama depois de persistir o convite. Mensageria escolhe os canais. */
export interface EnviarConvite {
  enviar(convite: ConviteParaEnvio): Promise<void>;
}
export const ENVIAR_CONVITE = Symbol("EnviarConvite");

export type PedidoDeRedefinicaoDeSenha = {
  to: string;
  name: string;
  resetUrl: string;
};

export interface EnviarRedefinicaoDeSenha {
  enviar(pedido: PedidoDeRedefinicaoDeSenha): Promise<void>;
}
export const ENVIAR_REDEFINICAO_DE_SENHA = Symbol("EnviarRedefinicaoDeSenha");
