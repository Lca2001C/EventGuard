"use client";

import { useParams } from "next/navigation";
import { BarChart3, Mail, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/platform/ui/badge";
import { Button } from "@/platform/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/ui/card";
import { useBaixarRelatorio, usePainelDoEvento } from "@/contexts/consulta";
import { useConvidados, useEnviarConvites } from "../application/recepcao";
import { dateTime } from "@/platform/ui/formatacao";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const { data: dashboard, isLoading, isError } = usePainelDoEvento(eventId);
  const { data: guests = [] } = useConvidados(eventId);

  const sendInvitations = useEnviarConvites(eventId, {
    onSuccess: (result) => toast.success(`Convites enviados: ${result.count}`),
    onError: () => toast.error("Nao foi possivel enviar os convites")
  });

  const downloadReport = useBaixarRelatorio(eventId, {
    onError: () => toast.error("Nao foi possivel gerar o relatorio")
  });

  if (isError) {
    return <p className="text-sm text-danger">Evento nao encontrado.</p>;
  }

  if (isLoading || !dashboard) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  const event = dashboard.event;

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
          <Button variant="secondary" onClick={() => sendInvitations.mutate()} disabled={sendInvitations.isPending}>
            <Mail className="h-4 w-4" />
            Enviar convites
          </Button>
          <Button variant="secondary" onClick={() => downloadReport.mutate("pdf")} disabled={downloadReport.isPending}>
            <BarChart3 className="h-4 w-4" />
            Relatorio
          </Button>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["Convidados", dashboard.totalGuests],
          ["Check-ins", dashboard.checkedIn],
          ["Ausentes", dashboard.absent],
          ["Taxa", `${dashboard.attendanceRate}%`]
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
          {guests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum convidado cadastrado.</p>
          ) : (
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
                {guests.slice(0, 12).map((guest) => (
                  <tr key={guest.id} className="border-b last:border-0">
                    <td className="py-3 font-medium" data-label="Nome">
                      {guest.name}
                    </td>
                    <td data-label="Email">{guest.email ?? "-"}</td>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
