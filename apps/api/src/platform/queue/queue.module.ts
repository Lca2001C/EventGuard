import { BullModule } from "@nestjs/bullmq";
import { DynamicModule, Global, Module } from "@nestjs/common";
import { EMAIL_QUEUE, QUEUE_ENABLED, WHATSAPP_QUEUE } from "./queue.constants";
import { parseRedisConnection } from "./redis.util";

/**
 * Registers BullMQ queues when REDIS_URL is present. When Redis is not
 * configured (typical local dev), the module registers no queues and callers
 * fall back to synchronous processing.
 */
@Global()
@Module({})
export class QueueModule {
  static forRoot(): DynamicModule {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return {
        module: QueueModule,
        global: true,
        providers: [{ provide: QUEUE_ENABLED, useValue: false }],
        exports: [QUEUE_ENABLED]
      };
    }

    return {
      module: QueueModule,
      global: true,
      imports: [
        BullModule.forRoot({ connection: parseRedisConnection(redisUrl) }),
        BullModule.registerQueue({ name: EMAIL_QUEUE }, { name: WHATSAPP_QUEUE })
      ],
      providers: [{ provide: QUEUE_ENABLED, useValue: true }],
      exports: [BullModule, QUEUE_ENABLED]
    };
  }
}
