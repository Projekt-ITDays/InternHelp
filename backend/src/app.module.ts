import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
// import { GeminiApiModule } from './gemini-api/gemini-api.module';
import { JwtModule } from '@nestjs/jwt';
import { AiModule } from './ai/ai.module';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';
import { ExperienceHandlerController } from './experience-handler/experience-handler.controller';
import { ExperienceHandlerService } from './experience-handler/experience-handler.service';
import { achievementEntity } from './entities/achievement.entity';
import { userEntity } from './entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forFeature([achievementEntity,userEntity]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'moja_aplikacja',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // wylacz to jak skonczymy pracowac nad baza danych, zeby nie stracic danych przy restarcie serwera
    }),
    AuthModule,
    //zmiana
    AiModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
    
  controllers: [AppController, ExperienceHandlerController],
  providers: [AppService, ExperienceHandlerService],
})
export class AppModule {}