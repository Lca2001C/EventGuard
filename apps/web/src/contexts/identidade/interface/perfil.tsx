"use client";

import { KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/platform/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/ui/card";
import { Input } from "@/platform/ui/input";
import {
  useAtivarSegundoFator,
  useAtualizarNome,
  usePrepararSegundoFator,
  useTrocarSenha
} from "../application/conta-do-usuario";
import { useAuth } from "../application/sessao";
import { TAMANHO_MINIMO_DA_SENHA } from "../domain/sessao";

export default function ProfilePage() {
  const { session, logout, refresh } = useAuth();
  const [name, setName] = useState(session?.user.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const saveName = useAtualizarNome({
    onSuccess: async () => {
      toast.success("Perfil atualizado");
      await refresh();
    },
    onError: () => toast.error("Nao foi possivel salvar o perfil")
  });

  const changePassword = useTrocarSenha({
    onSuccess: () => {
      toast.success("Senha atualizada");
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: () => toast.error("Nao foi possivel atualizar a senha")
  });

  const setupTwoFactor = usePrepararSegundoFator({
    onSuccess: (data) => setTwoFactorSecret(data.secret),
    onError: () => toast.error("Nao foi possivel iniciar o 2FA")
  });

  const enableTwoFactor = useAtivarSegundoFator({
    onSuccess: (data) => {
      toast.success("2FA ativado");
      setRecoveryCodes(data.recoveryCodes);
      setTwoFactorSecret(null);
      setTwoFactorCode("");
    },
    onError: () => toast.error("Codigo invalido")
  });

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
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" />
            <Input value={session?.user.email ?? ""} readOnly />
            <Button onClick={() => saveName.mutate(name)} disabled={saveName.isPending}>
              Salvar
            </Button>
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
            <Input
              type="password"
              placeholder="Senha atual"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <Input
              type="password"
              placeholder="Nova senha (min. 10)"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <Button
              variant="secondary"
              onClick={() => changePassword.mutate({ atual: currentPassword, nova: newPassword })}
              disabled={changePassword.isPending || newPassword.length < TAMANHO_MINIMO_DA_SENHA}
            >
              Atualizar senha
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              2FA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recoveryCodes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Guarde seus codigos de recuperacao:</p>
                <div className="grid grid-cols-2 gap-1 rounded-md border p-3 font-mono text-xs">
                  {recoveryCodes.map((code) => (
                    <span key={code}>{code}</span>
                  ))}
                </div>
              </div>
            ) : twoFactorSecret ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Adicione esta chave no seu app autenticador:
                </p>
                <code className="block rounded-md border p-2 text-xs">{twoFactorSecret}</code>
                <Input
                  inputMode="numeric"
                  placeholder="Codigo do app"
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value)}
                />
                <Button onClick={() => enableTwoFactor.mutate(twoFactorCode)} disabled={enableTwoFactor.isPending}>
                  Ativar 2FA
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setupTwoFactor.mutate()}
                disabled={setupTwoFactor.isPending}
              >
                Preparar autenticador
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessoes</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="danger" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
