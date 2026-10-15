"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { loginSchema, type LoginInput } from "@eventguard/validations";
import { Button } from "@/platform/ui/button";
import { Card, CardContent } from "@/platform/ui/card";
import { Input } from "@/platform/ui/input";
import { useAuth } from "../application/sessao";

export default function LoginPage() {
  const { login, verifyTwoFactor } = useAuth();
  const [twoFactor, setTwoFactor] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@demo.eventguard.local",
      password: "EventGuard@123"
    }
  });

  async function onSubmit(data: LoginInput) {
    try {
      const result = await login(data.email, data.password);
      if (result.twoFactorRequired) {
        setTwoFactor(true);
      }
    } catch {
      // toast handled in auth-context
    }
  }

  async function onVerify() {
    setVerifying(true);
    try {
      await verifyTwoFactor(code);
    } catch {
      // toast handled in auth-context
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Entrar</h1>
              <p className="text-sm text-muted-foreground">Acesse seu painel EventGuard</p>
            </div>
          </div>

          {twoFactor ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Informe o codigo do seu app autenticador (ou um codigo de recuperacao).
              </p>
              <Input
                inputMode="numeric"
                placeholder="Codigo 2FA"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <Button className="w-full" onClick={onVerify} disabled={verifying || code.length < 6}>
                Verificar
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground"
                onClick={() => setTwoFactor(false)}
              >
                Voltar
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <Input type="email" placeholder="E-mail" {...form.register("email")} />
              <Input type="password" placeholder="Senha" {...form.register("password")} />
              <div className="flex items-center justify-between text-sm">
                <Link className="text-primary" href="/forgot-password">
                  Esqueci senha
                </Link>
                <Link className="text-muted-foreground" href="/register">
                  Criar conta
                </Link>
              </div>
              <Button className="w-full" disabled={form.formState.isSubmitting}>
                Entrar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
