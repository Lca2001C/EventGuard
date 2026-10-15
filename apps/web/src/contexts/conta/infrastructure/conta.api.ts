import { api, API_BASE_URL } from "@/platform/http/cliente-http";
import type { MarcaDaConta, TenantResponse } from "../domain/conta";

export const tenantsApi = {
  async me(): Promise<TenantResponse> {
    const { data } = await api.get<TenantResponse>("/tenants/me");
    return data;
  },
  async update(input: MarcaDaConta) {
    const { data } = await api.patch("/tenants/me", input);
    return data;
  },
  async uploadLogo(file: File): Promise<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post<{ logoUrl: string }>("/tenants/me/logo", formData);
    return data;
  },
  /** URL que o Mercado Pago chama; exibida para o tenant configurar o painel do provedor. */
  urlDoWebhookDePagamento(): string {
    return `${API_BASE_URL}/webhooks/mercadopago`;
  }
};
