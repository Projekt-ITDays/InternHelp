import { HttpClient } from "@angular/common/http";
import { Inject, Injectable } from "@angular/core";
import { firstValueFrom, Observable } from "rxjs";
import { LoggingDto } from "../interfaces/loggingDto";
import { LoggingResponseDto } from "../interfaces/loggingResponseDto";

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly apiUrl = 'http://localhost:3000/auth';
    constructor(
        private readonly http : HttpClient
    ){}

    private accesToken: string | null = null;
    async login(payload : LoggingDto) : Promise<any> {
     
     
        const response = await this.http.post<LoggingResponseDto>(`${this.apiUrl}/login`, payload, {withCredentials: true}).subscribe({
            next: (data) => {
                console.log('Login successful:', data);
                this.setAccessToken(data.accesstoken);
                localStorage.setItem('username', data.username);

            }
        })  

        
    
    }

     register(payload : LoggingDto)  {
         this.http.post(`${this.apiUrl}/register`, payload);
    }


    //google login
    async googleLogin(){
        await this.http.get(`${this.apiUrl}/google/login`, {withCredentials: true});
    }

    async refreshToken() : Promise<any> {

        this.http.post(`${this.apiUrl}/refresh`, {}, {withCredentials: true}).subscribe({
            next: (data: any) => {
                this.setAccessToken(data.accesstoken);
            }
        })
        // return await this.http.post(`${this.apiUrl}/refresh`, {}, {withCredentials: true});
    }

    setAccessToken(token: string) {
        this.accesToken = token;
    }

    getAccessToken() {
        return this.accesToken;
    }
}