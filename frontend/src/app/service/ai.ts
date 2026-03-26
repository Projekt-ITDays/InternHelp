import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Ai {
  private apiUrl = 'http://localhost:3000/ai/ask';
  private sseUrl = 'http://localhost:3000/ai/roadmap';

  constructor(
    private http: HttpClient,
    private zone: NgZone 
  ) {}

  // Post
  askGemini(prompt: string): Observable<{ answer: any }> {
    return this.http.post<{ answer: any }>(this.apiUrl, { prompt });
  }

  // Strumień SSE
  streamRoadmap(careerPath: string): Observable<string> {
    return new Observable((observer) => {
      const url = `${this.sseUrl}?careerPath=${encodeURIComponent(careerPath)}`;
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        this.zone.run(() => {
          try {
            const parsedData = JSON.parse(event.data);
            const textChunk = parsedData.chunk || parsedData.text || ''; 
            observer.next(textChunk);
          } catch (e) {
            observer.next(event.data);
          }
        });
      };

      // Błędy w połączeniu SSE
      eventSource.onerror = (error) => {
        this.zone.run(() => {
          eventSource.close();
          observer.complete(); 
        });
      };

      // Funkcja czyszcząca
      return () => {
        eventSource.close();
      };
    });
  }
}