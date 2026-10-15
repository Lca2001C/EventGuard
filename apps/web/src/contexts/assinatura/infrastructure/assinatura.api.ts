import { api } from "@/platform/http/cliente-http";
import type { PaymentRow, PlanRow, SubscriptionResponse } from "../domain/assinatura";

export const billingApi = {
  async plans(): Promise<PlanRow[]> {
    const { data } = await api.get<PlanRow[]>("/billing/plans");
    return data;
  },
  async subscription(): Promise<SubscriptionResponse> {
    const { data } = await api.get<SubscriptionResponse>("/billing/subscription");
    return data;
  },
  async payments(): Promise<PaymentRow[]> {
    const { data } = await api.get<PaymentRow[]>("/billing/payments");
    return data;
  },
  async checkoutSubscription(planCode: string): Promise<PaymentRow> {
    const { data } = await api.post<PaymentRow>("/billing/checkout/subscription", { planCode });
    return data;
  },
  async changePlan(planCode: string): Promise<{ plan: PlanRow }> {
    const { data } = await api.post<{ plan: PlanRow }>("/billing/change-plan", { planCode });
    return data;
  }
};
