import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { LoggingDto } from "../interfaces/loggingDto";
import { LoggingResponseDto } from "../interfaces/loggingResponseDto";
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly apiUrl = `${environment.apiUrl}/auth`;
    // private readonly apiUrl = `${environment.apiUrl}/auth`;
    constructor(
        private readonly http: HttpClient
    ) { }

    private accesToken: string | null = null;
    private isLogged : boolean | null = null;
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

    register(payload: LoggingDto) {
        this.http.post(`${this.apiUrl}/register`, payload);
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
        this.accesToken = token;
        this.isLogged = true;
    }
    async logout(): Promise<void> {
        await firstValueFrom(
            this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
        );
        this.clearAccessToken();
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        this.isLogged = false;
    }
    getAccessToken() {
        return this.accesToken;
    }

    clearAccessToken() {
        this.accesToken = null;
    }
    isLoggedIn(): boolean {
        if (this.isLogged === null) {
            return false;
        }
        return true;
    }
}