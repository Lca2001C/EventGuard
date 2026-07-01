"use client";

import { useParams } from "next/navigation";
import { BarChart3, Mail, Settings, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { events, guests } from "@/lib/mock-data";
import { dateTime } from "@/lib/utils";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const event = events.find((item) => item.id === params.id) ?? events[0];
  const confirmed = guests.filter((guest) => guest.invitationStatus === "CONFIRMED").length;
  const checked = guests.filter((guest) => guest.invitationStatus === "CHECKED_IN").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{event.name}</h1>
          <p className="text-sm text-muted-foreground">
            {dateTime(event.startsAt)} · {event.locationName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">
            <Mail className="h-4 w-4" />
            Enviar convites
          </Button>
          <Button variant="secondary">
            <BarChart3 className="h-4 w-4" />
            Relatorio
          </Button>
          <Button size="icon" variant="ghost" aria-label="Configuracoes do evento">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["Convidados", event.guests],
          ["Confirmados", confirmed],
          ["Check-ins", checked],
          ["Taxa", `${Math.round((checked / guests.length) * 100)}%`]
        ].map(([label, value]) => (
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
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Convidados do evento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="responsive-table text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3">Nome</th>
                <th>Email</th>
                <th>Categoria</th>
                <th>Convite</th>
              </tr>
            </thead>
            <tbody>
              {guests.slice(0, 8).map((guest) => (
                <tr key={guest.id} className="border-b last:border-0">
                  <td className="py-3 font-medium" data-label="Nome">
                    {guest.name}
                  </td>
                  <td data-label="Email">{guest.email}</td>
                  <td data-label="Categoria">{guest.category}</td>
                  <td data-label="Convite">
                    <Badge tone={guest.invitationStatus === "CHECKED_IN" ? "success" : "primary"}>
                      {guest.invitationStatus}
                    </Badge>
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
