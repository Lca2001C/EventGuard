"use client";

import { useMutation, useQuery, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import type { NovoUsuario, UserListItem } from "../domain/sessao";
import { authApi, profileApi, twoFactorApi, usersApi } from "../infrastructure/identidade.api";

type Opcoes<TResultado, TEntrada = void> = Omit<
  UseMutationOptions<TResultado, Error, TEntrada>,
  "mutationFn"
>;

export function useUsuarios() {
  return useQuery<UserListItem[]>({
    queryKey: ["users"],
    queryFn: () => usersApi.list()
  });
}

export function useCriarUsuario(opcoes?: Opcoes<unknown, NovoUsuario>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...opcoes,
    mutationFn: (usuario: NovoUsuario) => usersApi.create(usuario),
    onSuccess: async (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      await opcoes?.onSuccess?.(...args);
    }
  });
}

export function useAtualizarNome(opcoes?: Opcoes<unknown, string>) {
  return useMutation({ ...opcoes, mutationFn: (name: string) => profileApi.updateName(name) });
}

export function useTrocarSenha(opcoes?: Opcoes<unknown, { atual: string; nova: string }>) {
  return useMutation({
    ...opcoes,
    mutationFn: ({ atual, nova }: { atual: string; nova: string }) => profileApi.changePassword(atual, nova)
  });
}

export function usePrepararSegundoFator(opcoes?: Opcoes<{ secret: string; otpauthUrl: string }>) {
  return useMutation({ ...opcoes, mutationFn: () => twoFactorApi.setup() });
}

export function useAtivarSegundoFator(opcoes?: Opcoes<{ ok: boolean; recoveryCodes: string[] }, string>) {
  return useMutation({ ...opcoes, mutationFn: (code: string) => twoFactorApi.enable(code) });
}

export function solicitarRedefinicaoDeSenha(email: string) {
  return authApi.forgotPassword(email);
}

export function redefinirSenha(token: string, password: string) {
  return authApi.resetPassword(token, password);
}
