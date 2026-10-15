import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { InvitationWhatsappJob } from "../domain/mensagens";
import { invitationWhatsappTemplate } from "../domain/modelos";

/**
 * Provider-agnostic WhatsApp sender. Selects an adapter from WHATSAPP_PROVIDER:
 * - "meta": WhatsApp Cloud API (Graph)
 * - anything else / unset: logs the message (dev default)
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly provider: string;

  constructor(private readonly config: ConfigService) {
    this.provider = (this.config.get<string>("WHATSAPP_PROVIDER") ?? "").toLowerCase();
  }

  async sendInvitation(job: InvitationWhatsappJob): Promise<void> {
    const message = invitationWhatsappTemplate(job);

    if (this.provider === "meta") {
      const token = this.config.get<string>("WHATSAPP_TOKEN");
      const phoneId = this.config.get<string>("WHATSAPP_PHONE_ID");
      if (token && phoneId) {
        const response = await fetch(
          `https://graph.facebook.com/v20.0/${phoneId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: job.to,
              type: "text",
              text: { body: message }
            })
          }
        );
        if (!response.ok) {
          throw new Error(`WhatsApp request failed: ${response.status}`);
        }
        return;
      }
    }

    this.logger.log(`[whatsapp:log] to=${job.to}\n${message}`);
  }
}
