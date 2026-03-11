import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { userEntity } from 'src/entities/user.entity';
import { refeshTokenEntity } from 'src/entities/refreshtoken.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [TypeOrmModule.forFeature([userEntity, refeshTokenEntity])],
})
export class AuthModule {}
