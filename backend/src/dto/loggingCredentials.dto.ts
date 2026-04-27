import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator"


export class LoggingCredentialsDto {
    @IsString()
    username: string ;
    @IsString() 
    @MinLength(8, { message: 'Hasło musi mieć co najmniej 8 znaków' })
    @MaxLength(20, { message: 'Hasło jest zbyt długie (max 20 znaków)' })
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Hasło musi zawierać wielką literę, małą literę oraz cyfrę lub znak specjalny',
  })  
    @IsString()
    password: string ;

    @IsString()
    captchaToken: string;
}