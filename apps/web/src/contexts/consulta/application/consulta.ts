"use client";

import { useMutation, useQuery, type UseMutationOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createEventSocket } from "@/platform/realtime/socket-do-evento";
import type { CheckinRow, EventDashboard, FormatoDeRelatorio, ReportSummary } from "../domain/consulta";
import { consultaApi } from "../infrastructure/consulta.api";

type Opcoes<TResultado, TEntrada> = Omit<UseMutationOptions<TResultado, Error, TEntrada>, "mutationFn">;

export function usePainelDoEvento(eventId: string | undefined) {
  return useQuery<EventDashboard>({
    queryKey: ["event-dashboard", eventId],
    queryFn: () => consultaApi.painel(eventId as string),
    enabled: Boolean(eventId)
  });
}

export function useRelatorio(eventId: string) {
  return useQuery<ReportSummary>({
    queryKey: ["report-summary", eventId],
    queryFn: () => consultaApi.relatorio(eventId),
    enabled: Boolean(eventId)
  });
}

export function useBaixarRelatorio(eventId: string, opcoes?: Opcoes<void, FormatoDeRelatorio>) {
  return useMutation({
    ...opcoes,
    mutationFn: (formato: FormatoDeRelatorio) => consultaApi.baixarRelatorio(eventId, formato)
  });
}

/**
 * Últimas entradas do evento: carrega a lista e acrescenta, no topo, cada
 * entrada que o websocket publicar enquanto a tela estiver aberta.
 */
export function useEntradasAoVivo(eventId: string, limite = 10): CheckinRow[] {
  const [recent, setRecent] = useState<CheckinRow[]>([]);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    let active = true;
    consultaApi
      .entradas(eventId)
      .then((rows) => {
        if (active) {
          setRecent(rows.slice(0, limite));
        }
      })
      .catch(() => undefined);

    const socket = createEventSocket(eventId, (payload) => {
      const checkin = payload as CheckinRow;
      setRecent((current) => [checkin, ...current].slice(0, limite));
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [eventId, limite]);

  return recent;
}
