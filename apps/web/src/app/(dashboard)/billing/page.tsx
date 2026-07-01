"use client";

import { CreditCard, ReceiptText, RefreshCcw } from "lucide-react";
import { PLAN_CATALOG } from "@eventguard/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { payments } from "@/lib/mock-data";
import { money } from "@/lib/utils";

export default function BillingPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Assinatura, implantacao, pagamentos e uso do mes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <RefreshCcw className="h-4 w-4" />
            Reenviar cobranca
          </Button>
          <Button>
            <CreditCard className="h-4 w-4" />
            Pagar mensalidade
          </Button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {PLAN_CATALOG.map((plan) => (
          <Card key={plan.code} className={plan.code === "PROFESSIONAL" ? "border-primary" : undefined}>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{plan.name}</h2>
                {plan.code === "PROFESSIONAL" ? <Badge tone="primary">Atual</Badge> : null}
              </div>
              <p className="text-2xl font-semibold">{money(plan.priceCents)}</p>
              <p className="text-sm text-muted-foreground">
                {plan.includedGuests.toLocaleString("pt-BR")} convidados/mes · excedente {money(plan.overageCents)}
              </p>
              <Button variant={plan.code === "PROFESSIONAL" ? "secondary" : "primary"} className="w-full">
                {plan.code === "PROFESSIONAL" ? "Plano ativo" : "Trocar plano"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4" />
            Historico de pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="responsive-table text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3">Descricao</th>
                <th>Status</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b last:border-0">
                  <td className="py-3 font-medium" data-label="Descricao">
                    {payment.description}
                  </td>
                  <td data-label="Status">
                    <Badge tone={payment.status === "APPROVED" ? "success" : "warning"}>{payment.status}</Badge>
                  </td>
                  <td data-label="Valor">{money(payment.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
