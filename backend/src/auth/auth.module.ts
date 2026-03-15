import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { userEntity } from 'src/entities/user.entity';
import { refeshTokenEntity } from 'src/entities/refreshtoken.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleStrategy } from './strategies/google.strategy';
import { ConfigModule } from '@nestjs/config';
import googleOauthConfig from './config/google-oauth.config';
import { PassportModule } from '@nestjs/passport';

@Module({
  
  controllers: [AuthController],
  providers: [AuthService,GoogleStrategy],
  imports: [PassportModule.register({ session: false }),TypeOrmModule.forFeature([userEntity, refeshTokenEntity]),ConfigModule.forFeature(googleOauthConfig) ,
 ],
})
export class AuthModule {}
