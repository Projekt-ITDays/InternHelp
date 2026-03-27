import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Ai {
  private apiUrl = `${environment.apiUrl}/ai/ask`;

  constructor(private http: HttpClient) { }

  askGemini(prompt: string): Observable<{ answer: string }> {
    return this.http.post<{ answer: string }>(this.apiUrl, { prompt });
  }
}