import { DynamicModule, Global, Module, type Provider } from "@nestjs/common";
import { ENVIAR_CONVITE, ENVIAR_REDEFINICAO_DE_SENHA } from "../../shared/kernel";
import {
  CANAIS_DE_ENVIO,
  EntregarConvite,
  EntregarRedefinicaoDeSenha
} from "./application/enviar-mensagens";
import { DespachoDeMensagens } from "./infrastructure/despacho-de-mensagens";
import { MailerService } from "./infrastructure/mailer.service";
import { WhatsappService } from "./infrastructure/whatsapp.service";
import { EmailProcessor } from "./interface/fila/email.processor";
import { WhatsappProcessor } from "./interface/fila/whatsapp.processor";

/**
 * Contexto Mensageria: e-mail, WhatsApp, templates e processors BullMQ.
 * Exporta as portas EnviarConvite (Recepção) e EnviarRedefinicaoDeSenha
 * (Identidade). Global, como o antigo NotificationsModule: forRoot() é
 * chamado depois do ConfigModule para ler REDIS_URL já carregado do .env.
 */
@Global()
@Module({})
export class MensageriaModule {
  static forRoot(): DynamicModule {
    const queueEnabled = Boolean(process.env.REDIS_URL);
    const processors: Provider[] = queueEnabled ? [EmailProcessor, WhatsappProcessor] : [];

    return {
      module: MensageriaModule,
      global: true,
      providers: [
        MailerService,
        WhatsappService,
        { provide: CANAIS_DE_ENVIO, useClass: DespachoDeMensagens },
        EntregarConvite,
        EntregarRedefinicaoDeSenha,
        { provide: ENVIAR_CONVITE, useExisting: EntregarConvite },
        { provide: ENVIAR_REDEFINICAO_DE_SENHA, useExisting: EntregarRedefinicaoDeSenha },
        ...processors
      ],
      exports: [ENVIAR_CONVITE, ENVIAR_REDEFINICAO_DE_SENHA]
    };
  }
}
