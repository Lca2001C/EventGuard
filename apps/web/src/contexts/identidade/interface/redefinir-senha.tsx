"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/platform/ui/button";
import { Card, CardContent } from "@/platform/ui/card";
import { Input } from "@/platform/ui/input";
import { TAMANHO_MINIMO_DA_SENHA } from "../domain/sessao";
import { redefinirSenha } from "../application/conta-do-usuario";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      toast.error("Token invalido");
      return;
    }
    setSubmitting(true);
    try {
      await redefinirSenha(token, password);
      toast.success("Senha redefinida com sucesso");
      router.push("/login");
    } catch {
      toast.error("Nao foi possivel redefinir a senha");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-4 p-6">
        <h1 className="text-xl font-semibold">Redefinir senha</h1>
        {token ? (
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input
              type="password"
              placeholder="Nova senha (min. 10 caracteres)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={TAMANHO_MINIMO_DA_SENHA}
              required
            />
            <Button className="w-full" disabled={submitting || password.length < TAMANHO_MINIMO_DA_SENHA}>
              Redefinir senha
            </Button>
          </form>
        ) : (
          <p className="text-sm text-danger">Link invalido ou expirado.</p>
        )}
        <Link href="/login" className="block text-center text-sm text-primary">
          Voltar ao login
        </Link>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
