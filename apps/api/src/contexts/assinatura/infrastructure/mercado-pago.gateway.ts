import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { NaoAutenticado, Proibido } from "../../../shared/kernel";
import type {
  CabecalhosDaNotificacao,
  GatewayDePagamento,
  NotificacaoLida
} from "../application/portas";
import type { RetornoDoPagamento, SituacaoDoPagamento } from "../domain/pagamento";

/** Tradução do status do Mercado Pago para o do domínio. */
export function mapearStatusDoMercadoPago(status: string): SituacaoDoPagamento {
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

/** Camada anticorrupção do Mercado Pago: HTTP, SDK de assinatura e formato do payload. */
@Injectable()
export class MercadoPagoGateway implements GatewayDePagamento {
  constructor(private readonly configService: ConfigService) {}

  async criarCheckout(externalReference: string, titulo: string, valorEmCentavos: number): Promise<string> {
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
            title: titulo,
            quantity: 1,
            currency_id: "BRL",
            unit_price: valorEmCentavos / 100
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Proibido("Mercado Pago checkout could not be created");
    }

    const preference = (await response.json()) as { init_point?: string; sandbox_init_point?: string };
    return preference.init_point ?? preference.sandbox_init_point ?? "";
  }

  lerNotificacao(
    corpo: Record<string, unknown>,
    dataIdDaQuery: string | undefined,
    novoId: () => string
  ): NotificacaoLida {
    const data = corpo.data as { id?: string } | undefined;
    const dataId = dataIdDaQuery ?? (data?.id ? String(data.id) : undefined);

    return {
      dataId,
      chave: `${String(corpo.type ?? "unknown")}:${dataId ?? novoId()}:${String(corpo.action ?? "event")}`,
      tipo: String(corpo.type ?? corpo.action ?? "unknown")
    };
  }

  validarAssinatura(cabecalhos: CabecalhosDaNotificacao): void {
    const secret = this.configService.get<string>("MERCADOPAGO_WEBHOOK_SECRET");
    const isProduction = this.configService.get<string>("NODE_ENV") === "production";

    if (!secret && !isProduction) {
      return;
    }

    if (!secret || !cabecalhos.xSignature || !cabecalhos.xRequestId || !cabecalhos.dataId) {
      throw new NaoAutenticado("Invalid Mercado Pago webhook signature");
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature: cabecalhos.xSignature,
        xRequestId: cabecalhos.xRequestId,
        dataId: cabecalhos.dataId,
        secret
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        throw new NaoAutenticado("Invalid Mercado Pago webhook signature");
      }

      throw error;
    }
  }

  async buscarRecurso(corpo: Record<string, unknown>, dataId: string): Promise<Record<string, unknown> | null> {
    const token = this.configService.get<string>("MERCADOPAGO_ACCESS_TOKEN");
    if (!token) {
      return null;
    }

    const type = String(corpo.type);
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

  interpretar(recurso: Record<string, unknown>): RetornoDoPagamento {
    return {
      externalReference: String(
        recurso.external_reference ??
          recurso.externalReference ??
          (recurso.metadata as { external_reference?: string } | undefined)?.external_reference ??
          ""
      ),
      mercadoPagoPaymentId: recurso.id ? String(recurso.id) : undefined,
      status: mapearStatusDoMercadoPago(String(recurso.status ?? "pending"))
    };
  }
}
