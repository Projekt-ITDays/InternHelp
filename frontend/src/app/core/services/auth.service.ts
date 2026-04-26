import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { LoggingDto } from "../models/loggingDto";
import { LoggingResponseDto } from "../models/loggingResponseDto";
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly apiUrl = `${environment.apiUrl}/auth`;
    // private readonly apiUrl = `${environment.apiUrl}/auth`;
    constructor(
        private readonly http: HttpClient
    ) { }

    private accessToken: string | null = null;
    private isLogged: boolean | null = typeof window !== 'undefined' && !!localStorage.getItem('userId');
    async login(payload: LoggingDto): Promise<LoggingResponseDto> {
        
        const data = await firstValueFrom(
            this.http.post<LoggingResponseDto>(`${this.apiUrl}/login`, payload, { withCredentials: true })
        );
        
        this.setAccessToken(data.accesstoken);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userId', data.userId);
        this.isLogged =true;
        return data;
    }

    register(payload : LoggingDto) {
         return this.http.post(`${this.apiUrl}/register`, payload);
    }


    //google login
    googleLogin(): void {
        if (typeof window === 'undefined') {
            return;
        }

        window.location.href = `${this.apiUrl}/google/login`;
    }

    async refreshToken(): Promise<{ accesstoken: string }> {
        const data = await firstValueFrom(
            this.http.post<{ accesstoken: string }>(`${this.apiUrl}/refresh`, {}, { withCredentials: true })
        );

        this.setAccessToken(data.accesstoken);
        return data;
    }

    setAccessToken(token: string) {
        this.accessToken = token;
        this.isLogged = true;
    }
    async logout(): Promise<void> {
        try {
            await firstValueFrom(
                this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
            );
        } finally {
            this.clearAccessToken();
            localStorage.removeItem('username');
            localStorage.removeItem('userId');
            this.isLogged = false;
        }
    }

    getAccessToken(): string | null {
        return this.accessToken;
    }

    async ensureAccessToken(): Promise<boolean> {
        if (this.accessToken) {
            return true;
        }

        const hasLocalUser = typeof window !== 'undefined' && !!localStorage.getItem('userId');
        if (!hasLocalUser) {
            return false;
        }

        try {
            await this.refreshToken();
            return !!this.accessToken;
        } catch {
            this.clearAccessToken();
            localStorage.removeItem('username');
            localStorage.removeItem('userId');
            this.isLogged = false;
            return false;
        }
    }

    clearAccessToken() {
        this.accessToken = null;
        this.isLogged = null;
    }
    isLoggedIn(): boolean {
        return !!this.isLogged;
    }
}