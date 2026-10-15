import { mapearStatusDoMercadoPago } from "../infrastructure/mercado-pago.gateway";
import { PrismaAssinaturaRepository } from "../infrastructure/prisma-assinatura.repository";
import { ConsultarUso } from "./cobranca";
import { ProcessarNotificacaoDePagamento } from "./processar-notificacao";

describe("Assinatura", () => {
  it("calculates monthly overage", async () => {
    const prisma = {
      subscription: {
        findUnique: jest.fn().mockResolvedValue({
          plan: {
            includedGuests: 1000,
            overageCents: 20
          }
        })
      }
    };
    const medirUso = { medir: jest.fn().mockResolvedValue({ guestsUsed: 1200, checkinsUsed: 900 }) };
    const service = new ConsultarUso(
      new PrismaAssinaturaRepository(prisma as never),
      medirUso,
      { agora: () => new Date(2026, 6, 15, 12) }
    );

    const usage = await service.executar("tenant-1");

    expect(usage.overageGuests).toBe(200);
    expect(usage.overageAmountCents).toBe(4000);
    expect(medirUso.medir).toHaveBeenCalledWith(
      "tenant-1",
      new Date(2026, 6, 1),
      new Date(2026, 7, 0, 23, 59, 59)
    );
  });

  it("maps rejected payments", () => {
    expect(mapearStatusDoMercadoPago("rejected")).toBe("REJECTED");
  });
});

describe("ProcessarNotificacaoDePagamento", () => {
  const agora = new Date("2026-07-01T12:00:00.000Z");

  function build(status: string) {
    const gateway = {
      lerNotificacao: jest.fn(() => ({ dataId: "mp-1", chave: "payment:mp-1:event", tipo: "payment" })),
      validarAssinatura: jest.fn(),
      buscarRecurso: jest.fn().mockResolvedValue({ id: "mp-1", external_reference: "ref-1", status }),
      interpretar: jest.fn((recurso: Record<string, unknown>) => ({
        externalReference: String(recurso.external_reference),
        mercadoPagoPaymentId: String(recurso.id),
        status: mapearStatusDoMercadoPago(String(recurso.status))
      }))
    };
    const pagamentos = {
      buscarPorReferencia: jest.fn().mockResolvedValue({
        id: "payment-1",
        tenantId: "tenant-1",
        planId: "plan-pro",
        subscriptionId: "sub-1"
      }),
      alterar: jest.fn()
    };
    const assinaturas = { alterar: jest.fn() };
    const situacaoDaConta = { atualizar: jest.fn() };
    const notificacoes = { registrar: jest.fn(), marcarProcessada: jest.fn() };
    const service = new ProcessarNotificacaoDePagamento(
      gateway as never,
      notificacoes as never,
      pagamentos as never,
      assinaturas as never,
      situacaoDaConta,
      { novo: () => "uuid" },
      { agora: () => agora }
    );

    return { service, pagamentos, assinaturas, situacaoDaConta, notificacoes };
  }

  it("asks Conta to reactivate the tenant on the paid plan when approved", async () => {
    const { service, pagamentos, assinaturas, situacaoDaConta, notificacoes } = build("approved");

    await expect(service.executar({ body: { type: "payment" } })).resolves.toEqual({ ok: true });

    expect(pagamentos.alterar).toHaveBeenCalledWith("payment-1", {
      status: "APPROVED",
      mercadoPagoPaymentId: "mp-1",
      paidAt: agora
    });
    expect(situacaoDaConta.atualizar).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      situacao: "ACTIVE",
      planId: "plan-pro"
    });
    expect(assinaturas.alterar).toHaveBeenCalledWith(
      "sub-1",
      expect.objectContaining({ status: "ACTIVE", currentPeriodStart: agora })
    );
    expect(notificacoes.marcarProcessada).toHaveBeenCalledWith("payment:mp-1:event", agora);
  });

  it("asks Conta to mark the tenant past due when rejected", async () => {
    const { service, assinaturas, situacaoDaConta } = build("rejected");

    await service.executar({ body: { type: "payment" } });

    expect(situacaoDaConta.atualizar).toHaveBeenCalledWith({ tenantId: "tenant-1", situacao: "PAST_DUE" });
    expect(assinaturas.alterar).not.toHaveBeenCalled();
  });
});
