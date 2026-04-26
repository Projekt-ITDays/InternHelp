import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AiConcept {
  title: string;
  description: string;
  closedTasks?: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
  openTasks?: {
    challenge: string;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class Ai {

  private apiUrl = `${environment.apiUrl}/ai/ask`;
  private sseUrl = `${environment.apiUrl}/ai/roadmap`;

  constructor(
    private http: HttpClient,
    private zone: NgZone
  ) { }

  // Post
  askGemini(prompt: string): Observable<{ answer: any }> {
    return this.http.post<{ answer: any }>(this.apiUrl, { prompt });
  }

  submitSurveyPrompt(prompt: string): Observable<any> {
    const url = `${environment.apiUrl}/ai/survey-results`;
    return this.http.post<any>(url, { prompt });
  }

  // Pobieranie konceptów JSON z uwzględnieniem poziomu i wykluczeń
  getHexagonConcepts(careerPath: string, level: number = 1, exclude: string[] = []): Observable<{ concepts: AiConcept[] }> {
    let params = new HttpParams()
      .set('careerPath', careerPath)
      .set('level', level.toString());

    exclude.forEach(topic => {
      params = params.append('exclude', topic);
    });

    return this.http.get<{ concepts: AiConcept[] }>(`${environment.apiUrl}/ai/roadmap-concepts`, { params });
  }

  // Weryfikacja otwartego zadania
  verifyOpenTask(challenge: string, userAnswer: string): Observable<{ score: number, feedback: string }> {
    return this.http.post<{ score: number, feedback: string }>(`${environment.apiUrl}/ai/verify-task`, { challenge, userAnswer });
  }

  // Generowanie szczegółowych zadań na żądanie
  generateTasksForTopic(topic: string, difficulty: string): Observable<{ closedTasks: any[], openTasks: any[] }> {
    const params = new HttpParams().set('topic', topic).set('difficulty', difficulty);
    return this.http.get<{ closedTasks: any[], openTasks: any[] }>(`${environment.apiUrl}/ai/generate-tasks`, { params });
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

  async getUserPlans(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/ai/plans`, { withCredentials: true }));
  }

  async deleteUserPlan(planId: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${environment.apiUrl}/ai/plans/${planId}`, { withCredentials: true }));
  }

  async updatePlanTitle(planId: string, title: string): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${environment.apiUrl}/ai/plans/${planId}/title`, { title }, { withCredentials: true }));
  }
}