import { IsEnum, IsOptional, IsString } from "class-validator";
import type { CodigoDoPlano } from "../../../domain/assinatura";

export class CheckoutSetupDto {
  @IsOptional()
  @IsString()
  setupCode?: string;
}

export class CheckoutSubscriptionDto {
  @IsEnum(["STARTER", "PROFESSIONAL", "PREMIUM"])
  planCode: CodigoDoPlano;
}
