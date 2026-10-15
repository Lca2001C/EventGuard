"use client";

import { CheckCircle2, Keyboard, QrCode, ScanLine, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/platform/ui/badge";
import { Button } from "@/platform/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/ui/card";
import { Input } from "@/platform/ui/input";
import { useEntradasAoVivo } from "@/contexts/consulta";
import { useEventos, validarQrCode } from "../application/recepcao";
import {
  entradaLiberada,
  situacaoDaLeitura,
  tokenDoQrCode,
  type SituacaoDaPortaria
} from "../domain/recepcao";

const SCANNER_ID = "eventguard-qr-scanner";

export default function CheckinPage() {
  const [eventId, setEventId] = useState<string>("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<SituacaoDaPortaria>("idle");
  const [message, setMessage] = useState("Aguardando leitura");
  const [scanning, setScanning] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  const { data: events = [] } = useEventos();
  const recent = useEntradasAoVivo(eventId);

  useEffect(() => {
    if (!eventId && events.length > 0) {
      setEventId(events[0].id);
    }
  }, [eventId, events]);

  async function validate(value: string) {
    if (!value) {
      return;
    }

    try {
      const data = await validarQrCode({
        token: value,
        eventId: eventId || undefined,
        deviceFingerprint: window.navigator.userAgent,
        deviceName: "PWA reception"
      });
      const approved = entradaLiberada(data.result);
      setStatus(situacaoDaLeitura(data.result));
      setMessage(data.reason ?? data.result);
      toast[approved ? "success" : "warning"](data.reason ?? data.result);
    } catch {
      setStatus("denied");
      setMessage("Convite invalido");
      toast.error("Convite invalido");
    }
  }

  async function toggleScanner() {
    if (scanning) {
      await stopScanner();
      return;
    }

    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;
    setScanning(true);

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText: string) => {
          const parsed = tokenDoQrCode(decodedText);
          setToken(parsed);
          void validate(parsed);
        },
        () => undefined
      );
    } catch {
      toast.error("Nao foi possivel acessar a camera");
      setScanning(false);
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        await scanner.stop();
        await scanner.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  const statusStyle = {
    idle: "border-primary/30 bg-primary/10 text-primary",
    approved: "border-success/30 bg-success/10 text-success",
    denied: "border-danger/30 bg-danger/10 text-danger",
    warning: "border-warning/40 bg-warning/10 text-yellow-700 dark:text-yellow-300"
  }[status];

  return (
    <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Check-in</h1>
            <p className="text-sm text-muted-foreground">Tela otimizada para recepcao mobile e tablet.</p>
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
        <Card className="overflow-hidden">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div id={SCANNER_ID} className="overflow-hidden rounded-lg border bg-muted/40" />
            {!scanning ? (
              <div className="grid aspect-square place-items-center rounded-lg border bg-muted/40">
                <div className="text-center">
                  <ScanLine className="mx-auto h-16 w-16 text-primary" />
                  <p className="mt-4 text-sm font-medium">Scanner QR Code</p>
                  <p className="text-xs text-muted-foreground">Toque para ativar a camera</p>
                </div>
              </div>
            ) : null}
            <Button variant="secondary" className="w-full" onClick={toggleScanner}>
              <QrCode className="h-4 w-4" />
              {scanning ? "Parar scanner" : "Ativar scanner"}
            </Button>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Codigo manual"
              />
              <Button onClick={() => validate(token)}>
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
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum check-in ainda.</p>
            ) : (
              recent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{item.guest?.name ?? "Convidado"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.checkedInAt).toLocaleTimeString("pt-BR")}
                    </p>
                  </div>
                  <Badge tone={entradaLiberada(item.result) ? "success" : "warning"}>
                    {item.result}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
