import { IsEnum, IsHexColor, IsOptional, IsString, MinLength } from "class-validator";
import type { SituacaoDaConta } from "../../../../../shared/kernel";

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;
}

export class AdminCreateTenantDto extends UpdateTenantDto {
  @IsString()
  @MinLength(2)
  declare name: string;
}

export class AdminUpdateTenantDto extends UpdateTenantDto {
  @IsOptional()
  @IsEnum(["TRIAL", "ACTIVE", "PAST_DUE", "BLOCKED", "CANCELED"])
  status?: SituacaoDaConta;
}
