import { Transform } from "class-transformer";
import { IsEmail, IsString } from "class-validator";

export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => String(value).toLowerCase().trim())
  email: string;

  @IsString()
  password: string;
}
