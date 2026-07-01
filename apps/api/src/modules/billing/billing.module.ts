import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditModule } from "../audit/audit.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  imports: [AuditModule, ConfigModule],
  controllers: [BillingController],
  providers: [BillingService]
})
export class BillingModule {}
