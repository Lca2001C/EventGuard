import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { EMAIL_QUEUE } from "../../../../platform/queue/queue.constants";
import { EMAIL_JOB } from "../../infrastructure/jobs";
import { MailerService } from "../../infrastructure/mailer.service";
import type { InvitationEmailJob, PasswordResetEmailJob } from "../../domain/mensagens";

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailer: MailerService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case EMAIL_JOB.PASSWORD_RESET:
        await this.mailer.sendPasswordReset(job.data as PasswordResetEmailJob);
        break;
      case EMAIL_JOB.INVITATION:
        await this.mailer.sendInvitation(job.data as InvitationEmailJob);
        break;
      default:
        this.logger.warn(`Unknown email job: ${job.name}`);
    }
  }
}
