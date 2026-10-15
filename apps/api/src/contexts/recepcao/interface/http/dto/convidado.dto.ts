import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";
import type { CategoriaDoConvidado } from "../../../domain/convidado/convidado";

export class CompanionDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  document?: string;
}

export class CreateGuestDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => (value ? String(value).toLowerCase().trim() : undefined))
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsEnum(["COMMON", "VIP", "FAMILY", "STAFF", "SUPPLIER"])
  category?: CategoriaDoConvidado;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  isVip?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  companionLimit?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanionDto)
  companions?: CompanionDto[];
}

export class UpdateGuestDto extends CreateGuestDto {}

export class ImportGuestsDto {
  @IsOptional()
  @IsString()
  csv?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGuestDto)
  rows?: CreateGuestDto[];
}
