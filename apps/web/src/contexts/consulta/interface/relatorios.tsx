"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/platform/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/ui/card";
import { useEventos } from "@/contexts/recepcao";
import { useBaixarRelatorio, useRelatorio } from "../application/consulta";
import { FORMATOS_DE_RELATORIO } from "../domain/consulta";

export default function ReportsPage() {
  const [eventId, setEventId] = useState<string>("");

  const { data: events = [] } = useEventos();

  useEffect(() => {
    if (!eventId && events.length > 0) {
      setEventId(events[0].id);
    }
  }, [eventId, events]);

  const { data: summary } = useRelatorio(eventId);

  const download = useBaixarRelatorio(eventId, {
    onError: () => toast.error("Nao foi possivel exportar o relatorio")
  });

  const kpis = summary?.kpis;
  const cards: [string, string | number][] = [
    ["Total", kpis?.totalGuests ?? 0],
    ["Presentes", kpis?.present ?? 0],
    ["Ausentes", kpis?.absent ?? 0],
    ["Taxa", `${kpis?.attendanceRate ?? 0}%`]
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Relatorios</h1>
          <p className="text-sm text-muted-foreground">KPIs, presenca, ausentes e exportacoes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
          >
            <option value="" disabled>
              Selecione um evento
            </option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          {FORMATOS_DE_RELATORIO.map((format) => (
            <Button
              key={format.value}
              variant="secondary"
              disabled={!eventId || download.isPending}
              onClick={() => download.mutate(format.value)}
            >
              <Download className="h-4 w-4" />
              {format.label}
            </Button>
          ))}
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Resumo de presenca</CardTitle>
        </CardHeader>
        <CardContent>
          {kpis ? (
            <p className="text-sm text-muted-foreground">
              {kpis.present} de {kpis.totalGuests} convidados fizeram check-in ({kpis.attendanceRate}
              %). Tentativas duplicadas: {kpis.duplicateAttempts}.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione um evento para ver o resumo.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
