import { registerAs } from "@nestjs/config";


export default registerAs("googleOAuth",()=>({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret : process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}))