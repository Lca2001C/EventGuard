"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/platform/ui/button";
import { Card, CardContent } from "@/platform/ui/card";
import { Input } from "@/platform/ui/input";
import { solicitarRedefinicaoDeSenha } from "../application/conta-do-usuario";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await solicitarRedefinicaoDeSenha(email);
      setSent(true);
      toast.success("Se o e-mail existir, enviaremos instrucoes");
    } catch {
      toast.error("Nao foi possivel enviar as instrucoes");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-semibold">Recuperar senha</h1>
          {sent ? (
            <p className="text-sm text-muted-foreground">
              Se o e-mail informado estiver cadastrado, voce recebera um link para redefinir a senha.
            </p>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Button className="w-full" disabled={submitting}>
                Enviar instrucoes
              </Button>
            </form>
          )}
          <Link href="/login" className="block text-center text-sm text-primary">
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
