"use client";

import { useMutation, useQuery, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import type { MarcaDaConta, TenantResponse } from "../domain/conta";
import { tenantsApi } from "../infrastructure/conta.api";

type Opcoes<TResultado, TEntrada> = Omit<UseMutationOptions<TResultado, Error, TEntrada>, "mutationFn">;

const MINHA_CONTA = ["tenant-me"];

export function useMinhaConta() {
  return useQuery<TenantResponse>({
    queryKey: MINHA_CONTA,
    queryFn: () => tenantsApi.me()
  });
}

export function useSalvarMarca(opcoes?: Opcoes<unknown, MarcaDaConta>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...opcoes,
    mutationFn: (marca: MarcaDaConta) => tenantsApi.update(marca),
    onSuccess: async (...args) => {
      void queryClient.invalidateQueries({ queryKey: MINHA_CONTA });
      await opcoes?.onSuccess?.(...args);
    }
  });
}

export function useEnviarLogo(opcoes?: Opcoes<{ logoUrl: string }, File>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...opcoes,
    mutationFn: (file: File) => tenantsApi.uploadLogo(file),
    onSuccess: async (...args) => {
      void queryClient.invalidateQueries({ queryKey: MINHA_CONTA });
      await opcoes?.onSuccess?.(...args);
    }
  });
}

export function urlDoWebhookDePagamento(): string {
  return tenantsApi.urlDoWebhookDePagamento();
}
