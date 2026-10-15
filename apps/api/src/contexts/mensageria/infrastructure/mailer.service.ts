import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { type Transporter } from "nodemailer";
import type { InvitationEmailJob, PasswordResetEmailJob } from "../domain/mensagens";
import { invitationEmailTemplate, passwordResetTemplate } from "../domain/modelos";

/**
 * Provider-agnostic mailer. Selects an adapter from EMAIL_PROVIDER:
 * - "smtp": nodemailer transport
 * - "resend": Resend HTTP API
 * - anything else / unset: logs the message (dev default)
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly provider: string;
  private readonly from: string;
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.provider = (this.config.get<string>("EMAIL_PROVIDER") ?? "").toLowerCase();
    this.from =
      this.config.get<string>("EMAIL_FROM") ?? "EventGuard <no-reply@eventguard.local>";

    if (this.provider === "smtp") {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>("SMTP_HOST"),
        port: Number(this.config.get<string>("SMTP_PORT") ?? 587),
        secure: this.config.get<string>("SMTP_SECURE") === "true",
        auth: {
          user: this.config.get<string>("SMTP_USER"),
          pass: this.config.get<string>("SMTP_PASSWORD")
        }
      });
    }
  }

  async sendPasswordReset(job: PasswordResetEmailJob): Promise<void> {
    const { subject, html, text } = passwordResetTemplate(job);
    await this.deliver(job.to, subject, html, text);
  }

  async sendInvitation(job: InvitationEmailJob): Promise<void> {
    const { subject, html, text } = invitationEmailTemplate(job);
    await this.deliver(job.to, subject, html, text);
  }

  private async deliver(to: string, subject: string, html: string, text: string): Promise<void> {
    if (this.provider === "smtp" && this.transporter) {
      await this.transporter.sendMail({ from: this.from, to, subject, html, text });
      return;
    }

    if (this.provider === "resend") {
      const apiKey = this.config.get<string>("EMAIL_API_KEY");
      if (apiKey) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ from: this.from, to, subject, html })
        });
        if (!response.ok) {
          throw new Error(`Resend request failed: ${response.status}`);
        }
        return;
      }
    }

    this.logger.log(`[email:log] to=${to} subject="${subject}"\n${text}`);
  }
}
