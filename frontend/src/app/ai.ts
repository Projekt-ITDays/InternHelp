import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Ai {
  private apiUrl = 'http://localhost:3000/ai/ask';

  constructor(private http: HttpClient) {}

  askGemini(prompt: string): Observable<{ answer: string }> {
    return this.http.post<{ answer: string }>(this.apiUrl, { prompt });
  }
}