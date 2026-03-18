import { HttpClient } from "@angular/common/http";
import { Inject, Injectable } from "@angular/core";
import { LoggingDto } from "../interfaces/loggingDto";

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly apiUrl = 'http://localhost:3000/auth';
    constructor(
        private readonly http : HttpClient
    ){}


    async login(payload : LoggingDto){
        return await this.http.post(this.apiUrl+ '/login' , {username : payload.username, password: payload.password})
    }

}