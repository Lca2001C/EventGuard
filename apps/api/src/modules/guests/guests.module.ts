import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { EventsModule } from "../events/events.module";
import { GuestsController } from "./guests.controller";
import { GuestsService } from "./guests.service";

@Module({
  imports: [AuditModule, EventsModule],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService]
})
export class GuestsModule {}
