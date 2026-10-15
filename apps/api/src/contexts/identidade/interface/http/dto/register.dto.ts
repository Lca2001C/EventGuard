import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  companyName: string;

  @IsEmail()
  @Transform(({ value }) => String(value).toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(10)
  password: string;

  @IsString()
  @MinLength(10)
  confirmPassword: string;

  @IsBoolean()
  termsAccepted: boolean;
}
