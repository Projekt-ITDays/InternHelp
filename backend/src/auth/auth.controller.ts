import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { LoggingCredentialsDto } from 'src/dto/loggingCredentials.dto';
import { AuthService } from './auth.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { GoogleGuard } from 'src/guards/googleguard.guard';
import type { Request, Response } from 'express';

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
    async register(@Body() payload: LoggingCredentialsDto)  {
        await this.authService.register(payload)
    }
    @UseGuards(AuthGuard)
    @Post('logout/:userId')
    async logout(@Param('userId') userId: string) {
         await this.authService.logout(userId)
        return { message: `Użytkownik o ID ${userId} zostałx/ wylogowany` };
    } 
    @UseGuards(GoogleGuard)
    @Get('google/login')
    async googleLogin() { 

    }
     @UseGuards(GoogleGuard)
    @Get('google/callback')
    async googleCallback(@Req() req: Request & { user: any },@Res() res: Response) {
        const response  = await this.authService.generateToken(req.user.id)
        res.redirect(`http://localhost?token=${encodeURIComponent(response.accesstoken)}&username=${encodeURIComponent(req.user.username)}&role=${encodeURIComponent(req.user.role)}`)
    }
}
