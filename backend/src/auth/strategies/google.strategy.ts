import {  Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-google-oauth20";
import googleOauthConfig from "../config/google-oauth.config";
import { AuthService } from "../auth.service";


@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(

         private readonly authService: AuthService,
        @Inject(googleOauthConfig.KEY   ) private readonly googleOAuthConfig: ConfigType<typeof googleOauthConfig>
        
    ){
        super({
            clientID: googleOAuthConfig.clientID! ,
            clientSecret: googleOAuthConfig.clientSecret!,
            callbackURL: googleOAuthConfig.callbackURL!,
            scope: ['email', 'profile']
        })
    }
    async validate(accesstoken : string , refreshToken : string ,profile : Profile) {
        const email = profile.emails?.[0]?.value
        if (!email) {
            throw new Error('Google profile does not contain email')
        }

        return this.authService.validateGoogleUser({ email })
    }
}



