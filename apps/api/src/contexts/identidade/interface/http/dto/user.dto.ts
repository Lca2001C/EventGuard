import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import type { Papel, SituacaoDoUsuario } from "../../../domain/usuario/usuario";

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
  role: Papel;

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
  status?: SituacaoDoUsuario;

  @IsOptional()
  @IsEnum(["TENANT_ADMIN", "ORGANIZER", "RECEPTION", "FINANCE"])
  role?: Papel;
}
