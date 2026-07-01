"use client";

import { KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";

export default function ProfilePage() {
  const { session, logout } = useAuth();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Perfil</h1>
        <p className="text-sm text-muted-foreground">Dados pessoais, senha, 2FA e sessoes ativas.</p>
      </div>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              Dados pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input defaultValue={session?.user.name} />
            <Input defaultValue={session?.user.email} />
            <Button>Salvar</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Alterar senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="password" placeholder="Senha atual" />
            <Input type="password" placeholder="Nova senha" />
            <Button variant="secondary">Atualizar senha</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              2FA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="secondary">Preparar autenticador</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessoes</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="danger" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Sair de todos os dispositivos
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
