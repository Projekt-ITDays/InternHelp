import { CanActivate, Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";



@Injectable()
export class AuthGuard implements CanActivate   {
    constructor(
        private readonly jwtService : JwtService
    ){

    }

    async canActivate(context: any): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = await this.extractTokenFromHeader(request)
        if(!token) {
            return false
        }
        try{
            const payload = this.jwtService.verify(token)
            request.user = payload.userID;
            request['user'] = payload
        }
        catch(err) {
            throw new Error('Invalid token')
        }
        return true
    }
    async extractTokenFromHeader(request: any): Promise<string | null> {
        const [type , token] = request.headers.authorization?.split(' ') || [];
        if(type !== 'Bearer' || !token) {
            return null
        }
        return token      
    }
}