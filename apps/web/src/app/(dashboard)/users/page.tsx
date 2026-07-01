"use client";

import { ShieldCheck, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const users = [
  { name: "Ana Admin", email: "admin@demo.eventguard.local", role: "TENANT_ADMIN", status: "ACTIVE" },
  { name: "Olivia Organizadora", email: "organizer@demo.eventguard.local", role: "ORGANIZER", status: "ACTIVE" },
  { name: "Rafa Recepcao", email: "reception@demo.eventguard.local", role: "RECEPTION", status: "ACTIVE" },
  { name: "Felipe Financeiro", email: "finance@demo.eventguard.local", role: "FINANCE", status: "ACTIVE" }
];

export default function UsersPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Equipe, permissoes e ultimo acesso.</p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4" />
          Novo usuario
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Nome" />
          <Input placeholder="Email" />
          <Input placeholder="Papel" />
          <Button className="w-full">Criar</Button>
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
          <table className="responsive-table text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3">Nome</th>
                <th>Email</th>
                <th>Papel</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.email} className="border-b last:border-0">
                  <td className="py-3 font-medium" data-label="Nome">
                    {user.name}
                  </td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Papel">{user.role}</td>
                  <td data-label="Status">
                    <Badge tone="success">{user.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
