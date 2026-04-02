import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggingCredentialsDto } from 'src/dto/loggingCredentials.dto';
import { LoginDto } from 'src/dto/login.dto';
import { refeshTokenEntity } from 'src/entities/refreshtoken.entity';
import { userEntity } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';
import {v4 as uuidv4} from  'uuid'

type GoogleProfileData = {
    email: string
}


@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(userEntity) private readonly userRepository : Repository<userEntity>,
        private readonly jwtService: JwtService,
        @InjectRepository(refeshTokenEntity) private readonly refreshTokenRepository : Repository<refeshTokenEntity>
    ){}

    async logout(userId: string) {
        await this.refreshTokenRepository.delete({userId})
    }
    async register(payload : LoggingCredentialsDto) {
        const user = await this.userRepository.findOne({where: {username: payload.username}})
        if(user) {
            throw new Error('User already exists')
        }
        
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(payload.password, salt)
        const newUser = {
            username: payload.username,
            password: hashedPassword
        }
        await this.userRepository.save(newUser)
    }   

    async login(payload : LoginDto) {
        const user = await this.userRepository.findOne({where: {username: payload.username}})
        if(!user) {
            throw new Error('User not found')
        }
        if(!(await bcrypt.compare(payload.password, user.password))) {
            throw new Error('Invalid password')
        }
        const token = await this.generateToken(user.id)
        
        return {
            ...token,
            username: payload.username,
            role: user.role
        }
    }


    async generateToken(userId: string) {
        const payload ={
            sub : userId
        }
        const accesstoken = this.jwtService.sign(payload)
        const refreshToken = uuidv4()
        await this.storeRefreshToken(userId, refreshToken)
        return {accesstoken, refreshToken}
        
    }
    async storeRefreshToken(userId: string, refreshToken: string) {
        const expairyDate = new Date();
        expairyDate.setDate(expairyDate.getDate() + 3)
        const newRefreshToken = this.refreshTokenRepository.create({
            userId,
            token: refreshToken,
            expiresAt: expairyDate
        })
        await this.refreshTokenRepository.save(newRefreshToken)
    }

    async refreshToken(oldRefreshToken: string) {
        const storedToken = await this.refreshTokenRepository.findOne({where: {token: oldRefreshToken}})
        if(!storedToken) {
            throw new Error('Invalid refresh token')
        }
        if(storedToken.expiresAt < new Date()) {
            
            throw new Error('Refresh token expired')
        }
        await this.refreshTokenRepository.delete(storedToken.id)
        return this.generateToken(storedToken.userId)
    }
    async validateGoogleUser(profile: GoogleProfileData) {
        const user = await this.userRepository.findOneBy({username: profile.email})
        if(user) {
            return user
        }

        const salt = await bcrypt.genSalt(10)
        const generatedPassword = `google-${uuidv4()}`
        const hashedPassword = await bcrypt.hash(generatedPassword, salt)

        return this.userRepository.save({
            username: profile.email,
            password: hashedPassword
        })
    }
}
