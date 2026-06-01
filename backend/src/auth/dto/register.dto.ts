import { IsEmail, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;

  @MinLength(3)
  @MaxLength(30)
  username!: string;
}
