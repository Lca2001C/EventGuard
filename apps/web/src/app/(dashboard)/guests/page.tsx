"use client";

import { Download, Upload, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { guests } from "@/lib/mock-data";

export default function GuestsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Convidados</h1>
          <p className="text-sm text-muted-foreground">Cadastro manual, importacao, categorias e acompanhantes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button variant="secondary">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button>
            <UserPlus className="h-4 w-4" />
            Novo convidado
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Nome" />
          <Input placeholder="Email" />
          <Input placeholder="Categoria" />
          <Button className="w-full">Cadastrar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de convidados</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="responsive-table text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3">Nome</th>
                <th>Email</th>
                <th>Categoria</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id} className="border-b last:border-0">
                  <td className="py-3 font-medium" data-label="Nome">
                    {guest.name}
                  </td>
                  <td data-label="Email">{guest.email}</td>
                  <td data-label="Categoria">{guest.category}</td>
                  <td data-label="Status">
                    <Badge tone={guest.invitationStatus === "CHECKED_IN" ? "success" : "primary"}>
                      {guest.invitationStatus}
                    </Badge>
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
