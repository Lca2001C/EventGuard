"use client";

import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/platform/ui/badge";
import { Button } from "@/platform/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/ui/card";
import { Input } from "@/platform/ui/input";
import { useCadastrarConvidado, useConvidados, useEventos } from "../application/recepcao";
import { CATEGORIAS_DE_CONVIDADO } from "../domain/recepcao";

const emptyGuest = { name: "", email: "", category: "COMMON" };

export default function GuestsPage() {
  const [eventId, setEventId] = useState<string>("");
  const [guestForm, setGuestForm] = useState(emptyGuest);

  const { data: events = [] } = useEventos();

  useEffect(() => {
    if (!eventId && events.length > 0) {
      setEventId(events[0].id);
    }
  }, [eventId, events]);

  const { data: guests = [], isLoading } = useConvidados(eventId);

  const createGuest = useCadastrarConvidado(eventId, {
    onSuccess: () => {
      toast.success("Convidado cadastrado");
      setGuestForm(emptyGuest);
    },
    onError: () => toast.error("Nao foi possivel cadastrar")
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Convidados</h1>
          <p className="text-sm text-muted-foreground">Cadastro manual, categorias e acompanhantes.</p>
        </div>
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
      </div>

      <Card>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!eventId) {
                toast.error("Selecione um evento");
                return;
              }
              createGuest.mutate({
                name: guestForm.name,
                email: guestForm.email || undefined,
                category: guestForm.category
              });
            }}
          >
            <Input
              placeholder="Nome"
              value={guestForm.name}
              onChange={(event) => setGuestForm({ ...guestForm, name: event.target.value })}
              required
            />
            <Input
              placeholder="Email"
              type="email"
              value={guestForm.email}
              onChange={(event) => setGuestForm({ ...guestForm, email: event.target.value })}
            />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={guestForm.category}
              onChange={(event) => setGuestForm({ ...guestForm, category: event.target.value })}
            >
              {CATEGORIAS_DE_CONVIDADO.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <Button className="w-full" disabled={createGuest.isPending}>
              <UserPlus className="h-4 w-4" />
              Cadastrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de convidados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : guests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum convidado cadastrado.</p>
          ) : (
            <table className="responsive-table text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3">Nome</th>
                  <th>Email</th>
                  <th>Categoria</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((guest) => (
                  <tr key={guest.id} className="border-b last:border-0">
                    <td className="py-3 font-medium" data-label="Nome">
                      {guest.name}
                    </td>
                    <td data-label="Email">{guest.email ?? "-"}</td>
                    <td data-label="Categoria">{guest.category}</td>
                    <td data-label="Status">
                      <Badge tone={guest.invitationStatus === "CHECKED_IN" ? "success" : "primary"}>
                        {guest.invitationStatus}
                      </Badge>
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
