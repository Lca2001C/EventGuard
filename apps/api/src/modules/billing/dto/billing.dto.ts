import { IsEnum, IsOptional, IsString } from "class-validator";
import type { PlanCode } from "@prisma/client";

export class CheckoutSetupDto {
  @IsOptional()
  @IsString()
  setupCode?: string;
}

export class CheckoutSubscriptionDto {
  @IsEnum(["STARTER", "PROFESSIONAL", "PREMIUM"])
  planCode: PlanCode;
}
