import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  completedAt: Date | null;
}

export interface ProgressData {
  level: number;
  experience: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
  achievements: Achievement[];
}

@Injectable({
  providedIn: 'root'
})
export class ExperienceService {
  private readonly apiUrl = `${environment.apiUrl}/experience-handler`;

  constructor(private readonly http: HttpClient) {}

  async getProgress(): Promise<ProgressData> {
    return firstValueFrom(
      this.http.get<ProgressData>(`${this.apiUrl}/progress`, { withCredentials: true })
    );
  }

  async addExperience(amount: number): Promise<ProgressData> {
    return firstValueFrom(
      this.http.post<ProgressData>(`${this.apiUrl}/add`, { amount }, { withCredentials: true })
    );
  }

  async removeExperience(amount: number): Promise<ProgressData> {
    return firstValueFrom(
      this.http.post<ProgressData>(`${this.apiUrl}/remove`, { amount }, { withCredentials: true })
    );
  }
}
