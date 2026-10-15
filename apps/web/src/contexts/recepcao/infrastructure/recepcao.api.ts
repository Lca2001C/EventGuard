import { api, withFallback } from "@/platform/http/cliente-http";
import type {
  ConvitePublico,
  EventDetail,
  EventListItem,
  GuestRow,
  LeituraDeQrCode,
  NovoConvidado,
  NovoEvento,
  ResultadoDaLeitura
} from "../domain/recepcao";

export const eventsApi = {
  async list(params?: { search?: string; status?: string }): Promise<EventListItem[]> {
    const { data } = await api.get<EventListItem[]>("/events", { params });
    return data;
  },
  async get(id: string): Promise<EventDetail> {
    const { data } = await api.get<EventDetail>(`/events/${id}`);
    return data;
  },
  async create(input: NovoEvento): Promise<EventListItem> {
    const { data } = await api.post<EventListItem>("/events", input);
    return data;
  }
};

export const guestsApi = {
  async list(eventId: string, params?: { search?: string; category?: string }): Promise<GuestRow[]> {
    const { data } = await api.get<GuestRow[]>(`/events/${eventId}/guests`, { params });
    return data;
  },
  async create(eventId: string, input: NovoConvidado): Promise<GuestRow> {
    const { data } = await api.post<GuestRow>(`/events/${eventId}/guests`, input);
    return data;
  },
  async importCsv(eventId: string, csv: string): Promise<{ count: number }> {
    const { data } = await api.post<{ count: number }>(`/events/${eventId}/guests/import`, { csv });
    return data;
  }
};

export const invitationsApi = {
  async generate(eventId: string, guestIds?: string[]) {
    const { data } = await api.post(`/events/${eventId}/invitations/generate`, { guestIds });
    return data;
  },
  async send(eventId: string, guestIds?: string[]): Promise<{ count: number }> {
    const { data } = await api.post<{ count: number }>(`/events/${eventId}/invitations/send`, {
      guestIds
    });
    return data;
  },
  /** Convite público; em falha, devolve o convite de demonstração informado. */
  publico(token: string, demonstracao: ConvitePublico): Promise<ConvitePublico> {
    return withFallback(api.get<ConvitePublico>(`/invite/${token}`), demonstracao);
  },
  async confirmar(token: string) {
    await api.post(`/invite/${token}/confirm`);
  }
};

export const checkinsApi = {
  async validate(input: LeituraDeQrCode): Promise<ResultadoDaLeitura> {
    const { data } = await api.post<ResultadoDaLeitura>("/checkins/validate", input);
    return data;
  }
};
