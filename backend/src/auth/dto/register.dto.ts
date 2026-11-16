import { IsEmail, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @MinLength(3)
  @MaxLength(30)
  username!: string;
}
