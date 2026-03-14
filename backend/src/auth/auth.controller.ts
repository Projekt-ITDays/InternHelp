import { Body, Controller, Param, Post } from '@nestjs/common';
import { LoggingCredentialsDto } from 'src/dto/loggingCredentials.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {

    constructor(
        private authService: AuthService
    ){

    }
    
    @Post('login')
    login(@Body() payload: LoggingCredentialsDto)  {
        return this.authService.login(payload)}

    @Post('register')
    register(@Body() payload: LoggingCredentialsDto)  {
        this.authService.register(payload)
    }
    @Post('logout/:userId')
    logout(@Param('userId') userId: string) {
         this.authService.logout(userId)
        return { message: `Użytkownik o ID ${userId} zostałx/ wylogowany` };
    } 
}
