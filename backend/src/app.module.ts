import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GeminiApiModule } from './gemini-api/gemini-api.module';
import { JwtModule } from '@nestjs/jwt';
import { ExperienceHandlerController } from './experience-handler/experience-handler.controller';
import { ExperienceHandlerService } from './experience-handler/experience-handler.service';
import { userEntity } from './entities/user.entity';
import { achievementEntity } from './entities/achievement.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: true,
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
        family: 4,
      },
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    AuthModule,
    GeminiApiModule,
    TypeOrmModule.forFeature([userEntity, achievementEntity]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],

  controllers: [AppController, ExperienceHandlerController],
  providers: [AppService, ExperienceHandlerService],
})
export class AppModule { }