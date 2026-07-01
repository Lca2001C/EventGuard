import { randomUUID } from "node:crypto";
import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PaymentStatus, Prisma } from "@prisma/client";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { SETUP_FEES } from "@eventguard/shared";
import type { AuthenticatedUser } from "../../common/types/authenticated-request";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CheckoutSetupDto, CheckoutSubscriptionDto } from "./dto/billing.dto";

type WebhookInput = {
  body: Record<string, unknown>;
  xSignature?: string;
  xRequestId?: string;
  dataId?: string;
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService
  ) {}

  plans() {
    return this.prisma.plan.findMany({ orderBy: { priceCents: "asc" } });
  }

  async subscription(user: AuthenticatedUser) {
    const tenantId = this.requireTenant(user);
    const [subscription, usage] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { tenantId },
        include: { plan: true }
      }),
      this.currentUsage(tenantId)
    ]);

    return { subscription, usage };
  }

  async payments(user: AuthenticatedUser) {
    const tenantId = this.requireTenant(user);
    return this.prisma.payment.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async checkoutSetup(user: AuthenticatedUser, dto: CheckoutSetupDto) {
    const tenantId = this.requireTenant(user);
    const fee =
      SETUP_FEES.find((item) => item.code === dto.setupCode) ??
      SETUP_FEES.find((item) => item.code === "SETUP_STANDARD") ??
      SETUP_FEES[0];

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        type: "SETUP",
        status: "PENDING",
        amountCents: fee.amountCents,
        description: fee.label,
        externalReference: `setup:${tenantId}:${randomUUID()}`
      }
    });
    const checkoutUrl = await this.createPreference(payment.externalReference, fee.label, fee.amountCents);

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: { checkoutUrl }
    });
  }

  async checkoutSubscription(user: AuthenticatedUser, dto: CheckoutSubscriptionDto) {
    const tenantId = this.requireTenant(user);
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { code: dto.planCode } });
    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId: plan.id,
        status: "INCOMPLETE"
      },
      create: {
        tenantId,
        planId: plan.id,
        status: "INCOMPLETE"
      }
    });
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        planId: plan.id,
        type: "SUBSCRIPTION",
        status: "PENDING",
        amountCents: plan.priceCents,
        description: `Mensalidade ${plan.name}`,
        externalReference: `subscription:${tenantId}:${plan.code}:${randomUUID()}`
      }
    });
    const checkoutUrl = await this.createPreference(payment.externalReference, payment.description, payment.amountCents);

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: { checkoutUrl }
    });
  }

  async changePlan(user: AuthenticatedUser, dto: CheckoutSubscriptionDto) {
    const tenantId = this.requireTenant(user);
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { code: dto.planCode } });
    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId: plan.id,
        status: "ACTIVE"
      },
      create: {
        tenantId,
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date()
      }
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        planId: plan.id,
        status: "ACTIVE"
      }
    });

    await this.auditService.record({
      tenantId,
      actorId: user.id,
      action: "billing.change_plan",
      entity: "subscription",
      entityId: subscription.id,
      metadata: { planCode: dto.planCode }
    });

    return { subscription, plan };
  }

  async handleMercadoPagoWebhook(input: WebhookInput) {
    const dataId = input.dataId ?? this.resolveDataId(input.body);
    this.validateWebhookSignature(input, dataId);

    const eventKey = `${String(input.body.type ?? "unknown")}:${dataId ?? randomUUID()}:${String(
      input.body.action ?? "event"
    )}`;
    await this.prisma.webhookEvent.upsert({
      where: { eventId: eventKey },
      update: { payload: input.body as Prisma.InputJsonValue, signature: input.xSignature },
      create: {
        provider: "mercadopago",
        eventId: eventKey,
        type: String(input.body.type ?? input.body.action ?? "unknown"),
        payload: input.body as Prisma.InputJsonValue,
        signature: input.xSignature
      }
    });

    const resource = dataId ? await this.fetchMercadoPagoResource(String(input.body.type), dataId) : input.body;
    await this.applyPaymentUpdate(resource ?? input.body);

    await this.prisma.webhookEvent.update({
      where: { eventId: eventKey },
      data: { processedAt: new Date() }
    });

    return { ok: true };
  }

  async currentUsage(tenantId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const [subscription, guestsUsed, checkinsUsed] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { tenantId }, include: { plan: true } }),
      this.prisma.guest.count({
        where: {
          tenantId,
          createdAt: { gte: periodStart, lte: periodEnd },
          deletedAt: null
        }
      }),
      this.prisma.checkin.count({
        where: {
          tenantId,
          createdAt: { gte: periodStart, lte: periodEnd },
          result: { in: ["APPROVED", "MANUAL"] }
        }
      })
    ]);
    const includedGuests = subscription?.plan.includedGuests ?? 0;
    const overageGuests = Math.max(guestsUsed - includedGuests, 0);
    const overageAmountCents = overageGuests * (subscription?.plan.overageCents ?? 0);

    return {
      periodStart,
      periodEnd,
      guestsUsed,
      checkinsUsed,
      includedGuests,
      overageGuests,
      overageAmountCents
    };
  }

  private async createPreference(externalReference: string, title: string, amountCents: number) {
    const token = this.configService.get<string>("MERCADOPAGO_ACCESS_TOKEN");
    const apiUrl = this.configService.get<string>("API_URL") ?? "http://localhost:4000";
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000";

    if (!token) {
      return `${frontendUrl}/billing?mockCheckout=${encodeURIComponent(externalReference)}`;
    }

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        external_reference: externalReference,
        notification_url: `${apiUrl.replace(/\/$/, "")}/webhooks/mercadopago`,
        back_urls: {
          success: `${frontendUrl}/billing?status=success`,
          failure: `${frontendUrl}/billing?status=failure`,
          pending: `${frontendUrl}/billing?status=pending`
        },
        items: [
          {
            title,
            quantity: 1,
            currency_id: "BRL",
            unit_price: amountCents / 100
          }
        ]
      })
    });

    if (!response.ok) {
      throw new ForbiddenException("Mercado Pago checkout could not be created");
    }

    const preference = (await response.json()) as { init_point?: string; sandbox_init_point?: string };
    return preference.init_point ?? preference.sandbox_init_point ?? "";
  }

  private validateWebhookSignature(input: WebhookInput, dataId?: string) {
    const secret = this.configService.get<string>("MERCADOPAGO_WEBHOOK_SECRET");
    const isProduction = this.configService.get<string>("NODE_ENV") === "production";

    if (!secret && !isProduction) {
      return;
    }

    if (!secret || !input.xSignature || !input.xRequestId || !dataId) {
      throw new UnauthorizedException("Invalid Mercado Pago webhook signature");
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature: input.xSignature,
        xRequestId: input.xRequestId,
        dataId,
        secret
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        throw new UnauthorizedException("Invalid Mercado Pago webhook signature");
      }

      throw error;
    }
  }

  private async fetchMercadoPagoResource(type: string, dataId: string) {
    const token = this.configService.get<string>("MERCADOPAGO_ACCESS_TOKEN");
    if (!token) {
      return null;
    }

    const url = type?.includes("subscription")
      ? `https://api.mercadopago.com/preapproval/search?id=${encodeURIComponent(dataId)}`
      : `https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Record<string, unknown>;
  }

  private async applyPaymentUpdate(resource: Record<string, unknown>) {
    const externalReference = String(
      resource.external_reference ??
        resource.externalReference ??
        (resource.metadata as { external_reference?: string } | undefined)?.external_reference ??
        ""
    );
    const mercadoPagoPaymentId = resource.id ? String(resource.id) : undefined;
    const status = this.mapPaymentStatus(String(resource.status ?? "pending"));

    if (!externalReference && !mercadoPagoPaymentId) {
      return;
    }

    const paymentLookup = [
      externalReference ? { externalReference } : null,
      mercadoPagoPaymentId ? { mercadoPagoPaymentId } : null
    ].filter(Boolean) as Array<{ externalReference: string } | { mercadoPagoPaymentId: string }>;

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: paymentLookup
      },
      include: {
        subscription: true
      }
    });

    if (!payment) {
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        mercadoPagoPaymentId,
        paidAt: status === "APPROVED" ? new Date() : undefined
      }
    });

    if (status === "APPROVED") {
      await this.prisma.tenant.update({
        where: { id: payment.tenantId },
        data: {
          status: "ACTIVE",
          planId: payment.planId ?? undefined
        }
      });

      if (payment.subscriptionId) {
        await this.prisma.subscription.update({
          where: { id: payment.subscriptionId },
          data: {
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        });
      }
    }

    if (status === "REJECTED") {
      await this.prisma.tenant.update({
        where: { id: payment.tenantId },
        data: { status: "PAST_DUE" }
      });
    }
  }

  private mapPaymentStatus(status: string): PaymentStatus {
    if (status === "approved" || status === "authorized") {
      return "APPROVED";
    }

    if (status === "rejected") {
      return "REJECTED";
    }

    if (status === "refunded") {
      return "REFUNDED";
    }

    if (status === "cancelled" || status === "canceled") {
      return "CANCELLED";
    }

    return "PENDING";
  }

  private resolveDataId(body: Record<string, unknown>): string | undefined {
    const data = body.data as { id?: string } | undefined;
    return data?.id ? String(data.id) : undefined;
  }

  private requireTenant(user: AuthenticatedUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException("Tenant scope is required");
    }

    return user.tenantId;
  }
}
