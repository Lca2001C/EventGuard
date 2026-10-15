// Recepção no front: eventos, convidados, convites e leitura do QR na portaria.

export type EventListItem = {
  id: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  locationName: string;
  address: string | null;
  capacity: number;
  allowCompanions: boolean;
  maxCompanionsPerGuest: number;
  status: string;
  _count?: { guests: number; checkins: number; invitations?: number };
};

export type GuestRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  category: string;
  invitationStatus: string;
  companionLimit: number;
  companions?: { id: string; name: string }[];
};

export type EventDetail = EventListItem & {
  guests: GuestRow[];
  _count?: { guests: number; checkins: number; invitations: number };
};

export type NovoEvento = {
  name: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
  capacity: number;
  address?: string;
  description?: string;
  allowCompanions?: boolean;
  maxCompanionsPerGuest?: number;
};

export type NovoConvidado = {
  name: string;
  email?: string;
  phone?: string;
  category?: string;
  companionLimit?: number;
};

export const CATEGORIAS_DE_CONVIDADO = ["COMMON", "VIP", "FAMILY", "STAFF", "SUPPLIER"];

export type LeituraDeQrCode = {
  token: string;
  eventId?: string;
  deviceFingerprint?: string;
  deviceName?: string;
};

export type ResultadoDaLeitura = { result: string; reason?: string };

export type SituacaoDaPortaria = "idle" | "approved" | "denied" | "warning";

/** Entrada liberada: aprovada pelo QR ou manual. */
export function entradaLiberada(result: string): boolean {
  return result === "APPROVED" || result === "MANUAL";
}

/** Como a portaria sinaliza o resultado: duplicado é alerta, o resto negado. */
export function situacaoDaLeitura(result: string): SituacaoDaPortaria {
  if (entradaLiberada(result)) {
    return "approved";
  }

  return result === "DUPLICATE" ? "warning" : "denied";
}

/** O QR traz o link público do convite; o token é o último trecho do caminho. */
export function tokenDoQrCode(conteudo: string): string {
  try {
    const url = new URL(conteudo);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? conteudo;
  } catch {
    return conteudo;
  }
}

export type ConvitePublico = {
  status: string;
  event: {
    name: string;
    startsAt: string;
    endsAt: string;
    locationName: string;
    address: string | null;
  };
  guest: {
    name: string;
    category: string;
    companionLimit: number;
  };
  qrCodeDataUrl: string;
};
