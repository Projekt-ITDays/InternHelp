import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { LoggingCredentialsDto } from 'src/dto/loggingCredentials.dto';
import { LoginDto } from 'src/dto/login.dto';
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
    async login(@Body() payload: LoginDto, @Res({passthrough : true}) res: Response)  {
        const resoult =  await this.authService.login(payload)
        // secure false dla pordukcji bo nie mamy https
        res.cookie('refreshToken', resoult.refreshToken, { httpOnly: true, secure: false, sameSite: 'lax',maxAge: 3 * 24 * 60 * 60 * 1000 })
        return {
            accesstoken: resoult.accesstoken,
            userId: resoult.userId,
            username: resoult.username,
            role: resoult.role
        }
    }

    @Post('register')
    async register(@Body() payload: LoggingCredentialsDto)  {
        await this.authService.register(payload)
    }
    @Post('refresh')
    async refreshToken(@Req() req: Request, @Res({passthrough : true}) res: Response) {
        const refreshToken = req.cookies['refreshToken']
        if(!refreshToken) {
            throw new Error('No refresh token provided')
        }
        const resoult = await this.authService.refreshToken(refreshToken)
        // Tutaj tak samo wylacznie do produkcji secure true
        res.cookie('refreshToken', resoult.refreshToken, { httpOnly: true, secure: false, sameSite: 'lax',maxAge: 3 * 24 * 60 * 60 * 1000 })
        return {
            accesstoken: resoult.accesstoken,
            
        }
    }
    @UseGuards(AuthGuard)
    @Post('logout')
    async logout(@Req() req: Request & { user: { sub: string } }, @Res({passthrough : true}) res: Response) {
         await this.authService.logout(req.user.sub)
         res.clearCookie('refreshToken', { httpOnly: true, secure: false, sameSite: 'lax' })
        return { message: `Użytkownik został wylogowany` };
    }
    @UseGuards(GoogleGuard)
    @Get('google/login')
    async googleLogin() {}
    
     @UseGuards(GoogleGuard)
    @Get('google/callback')
    async googleCallback(@Req() req: Request & { user: any },@Res() res: Response) {
        const response  = await this.authService.generateToken(req.user.id)
        res.redirect(`http://localhost?token=${encodeURIComponent(response.accesstoken)}&username=${encodeURIComponent(req.user.username)}&role=${encodeURIComponent(req.user.role)}`)
    }
}
