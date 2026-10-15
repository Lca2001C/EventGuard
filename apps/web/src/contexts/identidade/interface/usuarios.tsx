"use client";

import { ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/platform/ui/badge";
import { Button } from "@/platform/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/ui/card";
import { Input } from "@/platform/ui/input";
import { useCriarUsuario, useUsuarios } from "../application/conta-do-usuario";
import { PAPEIS_ATRIBUIVEIS } from "../domain/sessao";
import { dateTime } from "@/platform/ui/formatacao";

const emptyForm = { name: "", email: "", password: "", role: "ORGANIZER" };

export default function UsersPage() {
  const [form, setForm] = useState(emptyForm);

  const { data: users = [], isLoading, isError } = useUsuarios();

  const createUser = useCriarUsuario({
    onSuccess: () => {
      toast.success("Usuario criado");
      setForm(emptyForm);
    },
    onError: () => toast.error("Nao foi possivel criar o usuario")
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Equipe, permissoes e ultimo acesso.</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-5"
            onSubmit={(event) => {
              event.preventDefault();
              createUser.mutate(form);
            }}
          >
            <Input
              placeholder="Nome"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
            <Input
              placeholder="Senha"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            >
              {PAPEIS_ATRIBUIVEIS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <Button className="w-full" disabled={createUser.isPending}>
              <UserPlus className="h-4 w-4" />
              Criar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Controle de acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="text-sm text-danger">Nao foi possivel carregar os usuarios.</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <table className="responsive-table text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3">Nome</th>
                  <th>Email</th>
                  <th>Papel</th>
                  <th>Ultimo acesso</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-3 font-medium" data-label="Nome">
                      {user.name}
                    </td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Papel">{user.roles.map((entry) => entry.role.name).join(", ")}</td>
                    <td data-label="Ultimo acesso">
                      {user.lastLoginAt ? dateTime(user.lastLoginAt) : "-"}
                    </td>
                    <td data-label="Status">
                      <Badge tone={user.status === "ACTIVE" ? "success" : "warning"}>{user.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
