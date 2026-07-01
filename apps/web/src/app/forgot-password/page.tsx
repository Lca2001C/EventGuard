"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-xl font-semibold">Recuperar senha</h1>
          <Input type="email" placeholder="E-mail" />
          <Button className="w-full">Enviar instrucoes</Button>
          <Link href="/login" className="block text-center text-sm text-primary">
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
