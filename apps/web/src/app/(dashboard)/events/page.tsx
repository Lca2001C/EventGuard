"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, Filter, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, withFallback } from "@/lib/api";
import { events } from "@/lib/mock-data";
import { dateTime } from "@/lib/utils";

type EventRow = (typeof events)[number] & {
  _count?: {
    guests: number;
    checkins: number;
  };
};

export default function EventsPage() {
  const { data = events } = useQuery<EventRow[]>({
    queryKey: ["events"],
    queryFn: () => withFallback<EventRow[]>(api.get("/events"), events)
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Eventos</h1>
          <p className="text-sm text-muted-foreground">Crie, filtre e acompanhe eventos autorizados.</p>
        </div>
        <Button>
          <CalendarPlus className="h-4 w-4" />
          Novo evento
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar evento" />
          </div>
          <Button variant="secondary">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="responsive-table text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3">Nome</th>
                <th>Data</th>
                <th>Local</th>
                <th>Convidados</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((event) => (
                <tr key={event.id} className="border-b last:border-0">
                  <td className="py-3 font-medium" data-label="Nome">
                    {event.name}
                  </td>
                  <td data-label="Data">{dateTime(event.startsAt)}</td>
                  <td data-label="Local">{event.locationName}</td>
                  <td data-label="Convidados">{(event as EventRow)._count?.guests ?? event.guests}</td>
                  <td data-label="Status">
                    <Badge tone={event.status === "ACTIVE" ? "success" : "warning"}>{event.status}</Badge>
                  </td>
                  <td data-label="Detalhes">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/events/${event.id}`}>Abrir</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
