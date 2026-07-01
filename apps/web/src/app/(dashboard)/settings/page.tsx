"use client";

import { Bell, Building2, KeyRound, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Configuracoes</h1>
        <p className="text-sm text-muted-foreground">Empresa, marca, notificacoes, seguranca e webhooks.</p>
      </div>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input defaultValue="Demo Buffet" />
            <Input defaultValue="#2563eb" />
            <Button>Salvar</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificacoes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Email", "WhatsApp", "Alertas de duplicidade"].map((item) => (
              <label key={item} className="flex items-center justify-between rounded-md border p-3 text-sm">
                {item}
                <input type="checkbox" defaultChecked />
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Seguranca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input defaultValue="JWT access 15m" readOnly />
            <Input defaultValue="Refresh token rotativo" readOnly />
            <Input defaultValue="2FA preparado" readOnly />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input defaultValue="https://api.eventguard.com/webhooks/mercadopago" />
            <Button variant="secondary">Testar webhook</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
