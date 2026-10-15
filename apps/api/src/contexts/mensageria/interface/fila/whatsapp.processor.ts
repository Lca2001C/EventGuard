import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { WHATSAPP_QUEUE } from "../../../../platform/queue/queue.constants";
import type { InvitationWhatsappJob } from "../../domain/mensagens";
import { WHATSAPP_JOB } from "../../infrastructure/jobs";
import { WhatsappService } from "../../infrastructure/whatsapp.service";

@Processor(WHATSAPP_QUEUE)
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(private readonly whatsapp: WhatsappService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case WHATSAPP_JOB.INVITATION:
        await this.whatsapp.sendInvitation(job.data as InvitationWhatsappJob);
        break;
      default:
        this.logger.warn(`Unknown whatsapp job: ${job.name}`);
    }
  }
}
