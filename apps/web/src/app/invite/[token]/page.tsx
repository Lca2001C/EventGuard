"use client";

import { useParams } from "next/navigation";
import { CalendarPlus, CheckCircle2, MapPin, QrCode } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, withFallback } from "@/lib/api";
import { dateTime } from "@/lib/utils";

const fallbackInvite = {
  status: "CONFIRMED",
  event: {
    name: "Casamento Marina e Theo",
    startsAt: "2026-07-11T19:00:00.000Z",
    endsAt: "2026-07-12T02:00:00.000Z",
    locationName: "Demo Buffet Hall",
    address: "Av. Principal, 1000"
  },
  guest: {
    name: "Convidado Demo",
    category: "VIP",
    companionLimit: 2
  },
  qrCodeDataUrl: ""
};

export default function PublicInvitePage() {
  const params = useParams<{ token: string }>();
  const { data } = useQuery<typeof fallbackInvite>({
    queryKey: ["invite", params.token],
    queryFn: () => withFallback(api.get(`/invite/${params.token}`), fallbackInvite)
  });
  const invite = data ?? fallbackInvite;

  async function confirm() {
    await api.post(`/invite/${params.token}/confirm`).catch(() => null);
    toast.success("Presenca confirmada");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-8">
      <Card className="w-full max-w-lg overflow-hidden">
        <div className="h-28 bg-[url('https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center" />
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge tone="primary">{invite.status}</Badge>
              <h1 className="mt-3 text-2xl font-semibold">{invite.event.name}</h1>
              <p className="text-sm text-muted-foreground">{invite.guest.name}</p>
            </div>
            <QrCode className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-primary" />
              {dateTime(invite.event.startsAt)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {invite.event.locationName} · {invite.event.address}
            </p>
          </div>

          <div className="grid place-items-center rounded-lg border bg-white p-5">
            {invite.qrCodeDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="QR Code do convite" className="h-56 w-56" src={invite.qrCodeDataUrl} />
            ) : (
              <QrCode className="h-44 w-44 text-zinc-900" />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={confirm}>
              <CheckCircle2 className="h-4 w-4" />
              Confirmar presenca
            </Button>
            <Button variant="secondary">
              <CalendarPlus className="h-4 w-4" />
              Adicionar calendario
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
