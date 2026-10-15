"use client";

import { useMutation, useQuery, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import type { PaymentRow, PlanRow, SubscriptionResponse } from "../domain/assinatura";
import { billingApi } from "../infrastructure/assinatura.api";

type Opcoes<TResultado, TEntrada> = Omit<UseMutationOptions<TResultado, Error, TEntrada>, "mutationFn">;

export function usePlanos() {
  return useQuery<PlanRow[]>({
    queryKey: ["billing-plans"],
    queryFn: () => billingApi.plans()
  });
}

export function useAssinatura() {
  return useQuery<SubscriptionResponse>({
    queryKey: ["billing-subscription"],
    queryFn: () => billingApi.subscription()
  });
}

export function usePagamentos() {
  return useQuery<PaymentRow[]>({
    queryKey: ["billing-payments"],
    queryFn: () => billingApi.payments()
  });
}

export function useTrocarPlano(opcoes?: Opcoes<{ plan: PlanRow }, string>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...opcoes,
    mutationFn: (planCode: string) => billingApi.changePlan(planCode),
    onSuccess: async (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["billing-subscription"] });
      void queryClient.invalidateQueries({ queryKey: ["billing-payments"] });
      await opcoes?.onSuccess?.(...args);
    }
  });
}

/** Abre o checkout do provedor numa nova aba, quando ele devolve a URL. */
export function usePagarMensalidade(opcoes?: Opcoes<PaymentRow, string>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...opcoes,
    mutationFn: (planCode: string) => billingApi.checkoutSubscription(planCode),
    onSuccess: async (payment, ...rest) => {
      if (payment.checkoutUrl) {
        window.open(payment.checkoutUrl, "_blank");
      }
      void queryClient.invalidateQueries({ queryKey: ["billing-payments"] });
      await opcoes?.onSuccess?.(payment, ...rest);
    }
  });
}
