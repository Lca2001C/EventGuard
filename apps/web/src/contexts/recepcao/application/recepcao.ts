"use client";

import { useMutation, useQuery, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import type {
  ConvitePublico,
  EventListItem,
  GuestRow,
  LeituraDeQrCode,
  NovoConvidado,
  NovoEvento
} from "../domain/recepcao";
import { checkinsApi, eventsApi, guestsApi, invitationsApi } from "../infrastructure/recepcao.api";

type Opcoes<TResultado, TEntrada = void> = Omit<
  UseMutationOptions<TResultado, Error, TEntrada>,
  "mutationFn"
>;

/** Eventos do tenant; com busca, a lista é filtrada pelo nome. */
export function useEventos(search?: string) {
  return useQuery<EventListItem[]>({
    queryKey: search === undefined ? ["events"] : ["events", search],
    queryFn: () => eventsApi.list(search ? { search } : undefined)
  });
}

export function useAbrirEvento(opcoes?: Opcoes<EventListItem, NovoEvento>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...opcoes,
    mutationFn: (evento: NovoEvento) => eventsApi.create(evento),
    onSuccess: async (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      await opcoes?.onSuccess?.(...args);
    }
  });
}

export function useConvidados(eventId: string) {
  return useQuery<GuestRow[]>({
    queryKey: ["event-guests", eventId],
    queryFn: () => guestsApi.list(eventId),
    enabled: Boolean(eventId)
  });
}

export function useCadastrarConvidado(eventId: string, opcoes?: Opcoes<GuestRow, NovoConvidado>) {
  const queryClient = useQueryClient();
  return useMutation({
    ...opcoes,
    mutationFn: (convidado: NovoConvidado) => guestsApi.create(eventId, convidado),
    onSuccess: async (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["event-guests", eventId] });
      await opcoes?.onSuccess?.(...args);
    }
  });
}

export function useEnviarConvites(eventId: string, opcoes?: Opcoes<{ count: number }>) {
  return useMutation({ ...opcoes, mutationFn: () => invitationsApi.send(eventId) });
}

export function validarQrCode(leitura: LeituraDeQrCode) {
  return checkinsApi.validate(leitura);
}

export function useConvitePublico(token: string, demonstracao: ConvitePublico) {
  return useQuery<ConvitePublico>({
    queryKey: ["invite", token],
    queryFn: () => invitationsApi.publico(token, demonstracao)
  });
}

/** Confirmação pelo convidado; falha silenciosa, como na página pública original. */
export async function confirmarPresenca(token: string) {
  await invitationsApi.confirmar(token).catch(() => null);
}
