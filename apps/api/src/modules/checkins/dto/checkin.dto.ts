import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from "class-validator";

export class ValidateCheckinDto {
  @IsString()
  @MinLength(20)
  token: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  companionCount?: number;
}

export class ManualCheckinDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  guestId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  companionCount: number;

  @IsString()
  @MinLength(3)
  reason: string;
}
