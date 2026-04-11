import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GridState {
  gridCells: any[];
  topicStack: any[];
  currentLevel: number;
  updatedAt?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RoadmapStorageService {
  private readonly baseUrl = `${environment.apiUrl}/ai/plans`;

  constructor(private http: HttpClient) { }

  async saveGridState(planId: string, state: Omit<GridState, 'updatedAt'>): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch<{ success: boolean }>(
          `${this.baseUrl}/${planId}/grid-state`,
          state,
          { withCredentials: true }
        )
      );
    } catch (err) {
      console.error('Nie udało się zapisać stanu grafu w MongoDB:', err);
    }
  }

  async getGridState(planId: string): Promise<GridState | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ gridState: GridState | null }>(
          `${this.baseUrl}/${planId}/grid-state`,
          { withCredentials: true }
        )
      );
      return res.gridState ?? null;
    } catch (err) {
      console.error('Nie udało się pobrać stanu grafu z MongoDB:', err);
      return null;
    }
  }
}