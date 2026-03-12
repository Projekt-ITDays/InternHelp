import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { userEntity } from 'src/entities/user.entity';
import { refeshTokenEntity } from 'src/entities/refreshtoken.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

@Module({
  
  controllers: [AuthController],
  providers: [AuthService],
  imports: [TypeOrmModule.forFeature([userEntity, refeshTokenEntity]) , JwtModule.register({
    secret: process.env.JWT_SECRET || 'default_secret',
    signOptions: { expiresIn: '1h' },
  })  ],
})
export class AuthModule {}
