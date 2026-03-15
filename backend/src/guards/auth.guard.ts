import { CanActivate, Injectable, UnauthorizedException } from "@nestjs/common";
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
            throw new UnauthorizedException('Missing access token')
        }
        try{
           
            const payload = this.jwtService.verify(token)
            request['user'] = payload
        }
        catch(err) {
            // throw new UnorderedBulkOperation('Invalid access ');
            throw new UnauthorizedException('Invalid token')
        }
        return true
    }
    async extractTokenFromHeader(request: any): Promise<string | null> {
        const [type , token] = request.headers.authorization?.split(' ') || [];
        // console.log('Extracted token:', { type, token }); // Log the extracted type and token
        if(type !== 'Bearer' || !token) {
            return null
        }
        // console.log('Token extracted successfully:', token); // Log the successfully extracted token
        return token      
    }
}