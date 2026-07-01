import { IsArray, IsDateString, IsOptional, IsUUID } from "class-validator";

export class GenerateInvitationsDto {
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  guestIds?: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class SendInvitationsDto {
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  guestIds?: string[];
}
