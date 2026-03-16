import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GeminiApiModule } from './gemini-api/gemini-api.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    GeminiApiModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
    
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}