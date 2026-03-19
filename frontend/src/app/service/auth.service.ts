import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
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
    async login(payload : LoggingDto) : Promise<LoggingResponseDto> {
        const data = await firstValueFrom(
            this.http.post<LoggingResponseDto>(`${this.apiUrl}/login`, payload, { withCredentials: true })
        );

        this.setAccessToken(data.accesstoken);
        localStorage.setItem('username', data.username);
        return data;
    }

     register(payload : LoggingDto)  {
         this.http.post(`${this.apiUrl}/register`, payload);
    }


    //google login
    googleLogin(): void {
        if (typeof window === 'undefined') {
            return;
        }

        window.location.href = `${this.apiUrl}/google/login`;
    }

    async refreshToken() : Promise<{ accesstoken: string }> {
        const data = await firstValueFrom(
            this.http.post<{ accesstoken: string }>(`${this.apiUrl}/refresh`, {}, { withCredentials: true })
        );

        this.setAccessToken(data.accesstoken);
        return data;
    }

    setAccessToken(token: string) {
        this.accesToken = token;
    }

    getAccessToken() {
        return this.accesToken;
    }

    clearAccessToken() {
        this.accesToken = null;
    }
}