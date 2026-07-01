import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength
} from "class-validator";
import type { EventStatus } from "@prisma/client";

export class CreateEventDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsString()
  @MinLength(2)
  locationName: string;

  @IsOptional()
  @IsString()
  address?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  capacity: number;

  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  allowCompanions: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  maxCompanionsPerGuest: number;

  @IsOptional()
  @IsDateString()
  checkinStartsAt?: string;

  @IsOptional()
  @IsDateString()
  checkinEndsAt?: string;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  capacity?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  allowCompanions?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  maxCompanionsPerGuest?: number;

  @IsOptional()
  @IsDateString()
  checkinStartsAt?: string;

  @IsOptional()
  @IsDateString()
  checkinEndsAt?: string;

  @IsOptional()
  @IsEnum(["DRAFT", "ACTIVE", "PAUSED", "FINISHED", "CANCELLED"])
  status?: EventStatus;
}
