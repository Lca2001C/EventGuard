"use client";

import { useState } from "react";
import { CheckCircle2, Keyboard, QrCode, ScanLine, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type Status = "idle" | "approved" | "denied" | "warning";

const latest = [
  { name: "Convidado Demo 08", time: "20:18", status: "Entrada liberada" },
  { name: "Convidado Demo 03", time: "20:16", status: "QR ja utilizado" },
  { name: "Convidado Demo 11", time: "20:14", status: "Entrada liberada" }
];

export default function CheckinPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("Aguardando leitura");

  async function validate() {
    if (!token) {
      return;
    }

    try {
      const { data } = await api.post("/checkins/validate", {
        token,
        deviceFingerprint: window.navigator.userAgent,
        deviceName: "PWA reception"
      });
      const approved = data.result === "APPROVED" || data.result === "MANUAL";
      setStatus(approved ? "approved" : data.result === "DUPLICATE" ? "warning" : "denied");
      setMessage(data.reason ?? data.result);
      toast[approved ? "success" : "warning"](data.reason ?? data.result);
    } catch {
      setStatus("denied");
      setMessage("Convite invalido");
      toast.error("Convite invalido");
    }
  }

  const statusStyle = {
    idle: "border-primary/30 bg-primary/10 text-primary",
    approved: "border-success/30 bg-success/10 text-success",
    denied: "border-danger/30 bg-danger/10 text-danger",
    warning: "border-warning/40 bg-warning/10 text-yellow-700 dark:text-yellow-300"
  }[status];

  return (
    <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Check-in</h1>
          <p className="text-sm text-muted-foreground">Tela otimizada para recepcao mobile e tablet.</p>
        </div>
        <Card className="overflow-hidden">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="grid aspect-square place-items-center rounded-lg border bg-muted/40">
              <div className="text-center">
                <ScanLine className="mx-auto h-16 w-16 text-primary" />
                <p className="mt-4 text-sm font-medium">Scanner QR Code</p>
                <p className="text-xs text-muted-foreground">PWA pronto para camera do dispositivo</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Codigo manual" />
              <Button onClick={validate}>
                <Keyboard className="h-4 w-4" />
                Validar
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <Card className={`border ${statusStyle}`}>
          <CardContent className="flex min-h-44 items-center gap-4 p-6">
            {status === "approved" ? <CheckCircle2 className="h-12 w-12" /> : <XCircle className="h-12 w-12" />}
            <div>
              <p className="text-sm uppercase tracking-wide">Status</p>
              <h2 className="mt-1 text-3xl font-semibold">{message}</h2>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Ultimos check-ins
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latest.map((item) => (
              <div key={`${item.name}-${item.time}`} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.time}</p>
                </div>
                <Badge tone={item.status.includes("liberada") ? "success" : "warning"}>{item.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
