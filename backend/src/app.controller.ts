import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './guards/auth.guard';
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('version')
  getVersion() {
    return {
      version: '1.1.0-debug',
      timestamp: new Date().toISOString(),
      info: 'Debug version with captchaToken support'
    };
  }

  @UseGuards(AuthGuard)
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
