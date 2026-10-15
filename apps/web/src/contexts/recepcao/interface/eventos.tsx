"use client";

import { CalendarPlus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/platform/ui/badge";
import { Button } from "@/platform/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/ui/card";
import { Input } from "@/platform/ui/input";
import { useAbrirEvento, useEventos } from "../application/recepcao";
import { dateTime } from "@/platform/ui/formatacao";

type EventFormState = {
  name: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
  capacity: string;
};

const emptyForm: EventFormState = {
  name: "",
  startsAt: "",
  endsAt: "",
  locationName: "",
  capacity: "100"
};

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventFormState>(emptyForm);

  const { data = [], isLoading, isError } = useEventos(search);

  const createEvent = useAbrirEvento({
    onSuccess: () => {
      toast.success("Evento criado");
      setForm(emptyForm);
      setShowForm(false);
    },
    onError: () => toast.error("Nao foi possivel criar o evento")
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Eventos</h1>
          <p className="text-sm text-muted-foreground">Crie, filtre e acompanhe eventos autorizados.</p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          <CalendarPlus className="h-4 w-4" />
          Novo evento
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Novo evento</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                createEvent.mutate({
                  name: form.name,
                  startsAt: new Date(form.startsAt).toISOString(),
                  endsAt: new Date(form.endsAt).toISOString(),
                  locationName: form.locationName,
                  capacity: Number(form.capacity)
                });
              }}
            >
              <Input
                placeholder="Nome"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
              <Input
                placeholder="Local"
                value={form.locationName}
                onChange={(event) => setForm({ ...form, locationName: event.target.value })}
                required
              />
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                required
              />
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                required
              />
              <Input
                type="number"
                min={1}
                placeholder="Capacidade"
                value={form.capacity}
                onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                required
              />
              <Button disabled={createEvent.isPending}>Salvar evento</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar evento"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="text-sm text-danger">Nao foi possivel carregar os eventos.</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
          ) : (
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
                    <td data-label="Convidados">{event._count?.guests ?? 0}</td>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
