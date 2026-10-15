import { IsString, Length, MinLength } from "class-validator";

export class TwoFactorCodeDto {
  @IsString()
  @Length(6, 10)
  code: string;
}

export class TwoFactorVerifyDto {
  @IsString()
  @MinLength(10)
  challengeToken: string;

  @IsString()
  @Length(6, 10)
  code: string;
}
