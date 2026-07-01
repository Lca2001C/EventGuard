import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import type { RoleName, UserStatus } from "@prisma/client";

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  @Transform(({ value }) => String(value).toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(10)
  password: string;

  @IsEnum(["TENANT_ADMIN", "ORGANIZER", "RECEPTION", "FINANCE"])
  role: RoleName;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(["ACTIVE", "DISABLED", "LOCKED"])
  status?: UserStatus;

  @IsOptional()
  @IsEnum(["TENANT_ADMIN", "ORGANIZER", "RECEPTION", "FINANCE"])
  role?: RoleName;
}
