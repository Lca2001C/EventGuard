import { api, baixarArquivo } from "@/platform/http/cliente-http";
import {
  extensaoDoRelatorio,
  type CheckinRow,
  type EventDashboard,
  type FormatoDeRelatorio,
  type ReportSummary
} from "../domain/consulta";

export const consultaApi = {
  async painel(eventId: string): Promise<EventDashboard> {
    const { data } = await api.get<EventDashboard>(`/events/${eventId}/dashboard`);
    return data;
  },
  async relatorio(eventId: string): Promise<ReportSummary> {
    const { data } = await api.get<ReportSummary>(`/events/${eventId}/reports/summary`);
    return data;
  },
  baixarRelatorio(eventId: string, formato: FormatoDeRelatorio): Promise<void> {
    return baixarArquivo(
      `/events/${eventId}/reports/${formato}`,
      `eventguard-${eventId}.${extensaoDoRelatorio(formato)}`
    );
  },
  async entradas(eventId: string): Promise<CheckinRow[]> {
    const { data } = await api.get<CheckinRow[]>(`/events/${eventId}/checkins`);
    return data;
  }
};
