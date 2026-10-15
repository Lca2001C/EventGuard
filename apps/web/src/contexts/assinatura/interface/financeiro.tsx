"use client";

import { ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/platform/ui/badge";
import { Button } from "@/platform/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/ui/card";
import {
  useAssinatura,
  usePagamentos,
  usePagarMensalidade,
  usePlanos,
  useTrocarPlano
} from "../application/assinatura";
import { pagamentoAprovado, planoAtual } from "../domain/assinatura";
import { money } from "@/platform/ui/formatacao";

export default function BillingPage() {
  const { data: plans = [] } = usePlanos();
  const { data: subscription } = useAssinatura();
  const { data: payments = [] } = usePagamentos();

  const currentPlanCode = planoAtual(subscription);

  const changePlan = useTrocarPlano({
    onSuccess: () => {
      toast.success("Plano atualizado");
    },
    onError: () => toast.error("Nao foi possivel trocar o plano")
  });

  const checkout = usePagarMensalidade({
    onError: () => toast.error("Nao foi possivel iniciar o pagamento")
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Assinatura, pagamentos e uso do mes.</p>
        </div>
        {currentPlanCode ? (
          <Button onClick={() => checkout.mutate(currentPlanCode)} disabled={checkout.isPending}>
            Pagar mensalidade
          </Button>
        ) : null}
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlanCode;
          return (
            <Card key={plan.code} className={isCurrent ? "border-primary" : undefined}>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{plan.name}</h2>
                  {isCurrent ? <Badge tone="primary">Atual</Badge> : null}
                </div>
                <p className="text-2xl font-semibold">{money(plan.priceCents)}</p>
                <p className="text-sm text-muted-foreground">
                  {plan.includedGuests.toLocaleString("pt-BR")} convidados/mes · excedente{" "}
                  {money(plan.overageCents)}
                </p>
                <Button
                  variant={isCurrent ? "secondary" : "primary"}
                  className="w-full"
                  disabled={isCurrent || changePlan.isPending}
                  onClick={() => changePlan.mutate(plan.code)}
                >
                  {isCurrent ? "Plano ativo" : "Trocar plano"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4" />
            Historico de pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
          ) : (
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
                      <Badge tone={pagamentoAprovado(payment) ? "success" : "warning"}>
                        {payment.status}
                      </Badge>
                    </td>
                    <td data-label="Valor">{money(payment.amountCents)}</td>
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
