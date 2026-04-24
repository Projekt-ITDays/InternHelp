import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Username jest wymagany' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Hasło jest wymagane' })
  password: string;

  @IsString()
  captchaToken: string;
}
