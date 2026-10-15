"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { registerSchema, type RegisterInput } from "@eventguard/validations";
import { Button } from "@/platform/ui/button";
import { Card, CardContent } from "@/platform/ui/card";
import { Input } from "@/platform/ui/input";
import { useAuth } from "../application/sessao";

export default function RegisterPage() {
  const { register } = useAuth();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      companyName: "",
      email: "",
      password: "",
      confirmPassword: "",
      termsAccepted: true
    }
  });

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Criar conta</h1>
              <p className="text-sm text-muted-foreground">Comece com um tenant em trial</p>
            </div>
          </div>
          <form className="grid gap-4" onSubmit={form.handleSubmit((data) => register(data))}>
            <Input placeholder="Nome" {...form.register("name")} />
            <Input placeholder="Empresa ou buffet" {...form.register("companyName")} />
            <Input type="email" placeholder="E-mail" {...form.register("email")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input type="password" placeholder="Senha" {...form.register("password")} />
              <Input type="password" placeholder="Confirmar senha" {...form.register("confirmPassword")} />
            </div>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input className="mt-1" type="checkbox" {...form.register("termsAccepted")} />
              Aceito os termos de uso e a politica de privacidade.
            </label>
            <Button className="w-full" disabled={form.formState.isSubmitting}>
              Criar conta
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Ja tem conta?{" "}
            <Link href="/login" className="text-primary">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
