import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { SurveyDto } from "../models/survey";
import { environment } from "../../../environments/environment";


@Injectable({
    providedIn: 'root'
})
export class SurveyService {
    constructor(
        private readonly http : HttpClient
    ) {}
    private readonly apiUrl = `${environment.apiUrl}/ai/survey`;
    postSurvey(payload : SurveyDto){
        return this.http.post(this.apiUrl, payload, { withCredentials: true });
    }
}