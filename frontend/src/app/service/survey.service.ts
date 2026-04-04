import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { SurveyDto } from "../interfaces/survey";
import { environment } from "../../environments/environment.development";


@Injectable({
    providedIn: 'root'
})
export class SurveyService {
    constructor(
        private readonly http : HttpClient
    ) {}
    private readonly apiUrl = `${environment.apiUrl}/ai/survey`;
    async postSurvey(payload : SurveyDto){
        return this.http.post(this.apiUrl, payload);
    }
}