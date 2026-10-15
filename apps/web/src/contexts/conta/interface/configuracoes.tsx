"use client";

import { Building2, Image as ImageIcon, KeyRound, Webhook } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/platform/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/ui/card";
import { Input } from "@/platform/ui/input";
import {
  urlDoWebhookDePagamento,
  useEnviarLogo,
  useMinhaConta,
  useSalvarMarca
} from "../application/conta";
import { COR_PADRAO } from "../domain/conta";

export default function SettingsPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState(COR_PADRAO);

  const { data: tenant } = useMinhaConta();

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setPrimaryColor(tenant.primaryColor);
    }
  }, [tenant]);

  const save = useSalvarMarca({
    onSuccess: () => {
      toast.success("Configuracoes salvas");
    },
    onError: () => toast.error("Nao foi possivel salvar")
  });

  const uploadLogo = useEnviarLogo({
    onSuccess: () => {
      toast.success("Logo atualizada");
    },
    onError: () => toast.error("Nao foi possivel enviar a logo")
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Configuracoes</h1>
        <p className="text-sm text-muted-foreground">Empresa, marca, seguranca e webhooks.</p>
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
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da empresa" />
            <Input
              value={primaryColor}
              onChange={(event) => setPrimaryColor(event.target.value)}
              placeholder="#2563eb"
            />
            <Button onClick={() => save.mutate({ name, primaryColor })} disabled={save.isPending}>
              Salvar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Marca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tenant?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt="Logo" className="h-16 w-16 rounded-md border object-contain" />
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma logo enviada.</p>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  uploadLogo.mutate(file);
                }
              }}
            />
            <Button
              variant="secondary"
              onClick={() => fileInput.current?.click()}
              disabled={uploadLogo.isPending}
            >
              Enviar logo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Seguranca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Access token JWT com expiracao de 15 minutos.</p>
            <p>Refresh token rotativo com deteccao de reuso.</p>
            <p>Autenticacao em duas etapas (2FA) disponivel no perfil.</p>
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
            <Input readOnly value={urlDoWebhookDePagamento()} />
            <p className="text-xs text-muted-foreground">
              Configure esta URL no painel do Mercado Pago para receber notificacoes de pagamento.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
