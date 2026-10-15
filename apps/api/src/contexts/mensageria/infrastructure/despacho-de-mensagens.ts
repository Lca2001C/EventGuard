import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Optional } from "@nestjs/common";
import type { Queue } from "bullmq";
import {
  DEFAULT_JOB_OPTIONS,
  EMAIL_QUEUE,
  WHATSAPP_QUEUE
} from "../../../platform/queue/queue.constants";
import type { CanaisDeEnvio } from "../application/enviar-mensagens";
import type {
  InvitationEmailJob,
  InvitationWhatsappJob,
  PasswordResetEmailJob
} from "../domain/mensagens";
import { EMAIL_JOB, WHATSAPP_JOB } from "./jobs";
import { MailerService } from "./mailer.service";
import { WhatsappService } from "./whatsapp.service";

/**
 * Entrega as mensagens. Com as filas BullMQ disponíveis, enfileira; sem
 * Redis (desenvolvimento local), envia na hora.
 */
@Injectable()
export class DespachoDeMensagens implements CanaisDeEnvio {
  constructor(
    private readonly mailer: MailerService,
    private readonly whatsapp: WhatsappService,
    @Optional() @InjectQueue(EMAIL_QUEUE) private readonly emailQueue?: Queue,
    @Optional() @InjectQueue(WHATSAPP_QUEUE) private readonly whatsappQueue?: Queue
  ) {}

  async emailDeRedefinicao(job: PasswordResetEmailJob): Promise<void> {
    if (this.emailQueue) {
      await this.emailQueue.add(EMAIL_JOB.PASSWORD_RESET, job, DEFAULT_JOB_OPTIONS);
      return;
    }
    await this.mailer.sendPasswordReset(job);
  }

  async emailDeConvite(job: InvitationEmailJob): Promise<void> {
    if (this.emailQueue) {
      await this.emailQueue.add(EMAIL_JOB.INVITATION, job, DEFAULT_JOB_OPTIONS);
      return;
    }
    await this.mailer.sendInvitation(job);
  }

  async whatsappDeConvite(job: InvitationWhatsappJob): Promise<void> {
    if (this.whatsappQueue) {
      await this.whatsappQueue.add(WHATSAPP_JOB.INVITATION, job, DEFAULT_JOB_OPTIONS);
      return;
    }
    await this.whatsapp.sendInvitation(job);
  }
}
