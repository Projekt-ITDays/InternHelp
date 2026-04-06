import { Injectable } from '@angular/core';

export interface SavedRoadmap {
  careerPath: string;
  roadmapContent: string;
  gridCells: any[];
  timestamp: number;
  currentLevel: number;
}

@Injectable({
  providedIn: 'root'
})
export class RoadmapStorageService {
  private readonly STORAGE_KEY = 'ih_saved_roadmaps';

  constructor() { }

  private getAll(): Record<string, SavedRoadmap> {
    const raw = sessionStorage.getItem(this.STORAGE_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  saveRoadmap(roadmap: SavedRoadmap): void {
    const all = this.getAll();
    all[roadmap.careerPath] = roadmap;
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
  }

  getRoadmap(careerPath: string): SavedRoadmap | null {
    const all = this.getAll();
    return all[careerPath] || null;
  }

  getAllRoadmapsAsArray(): SavedRoadmap[] {
    const all = this.getAll();
    return Object.values(all).sort((a, b) => b.timestamp - a.timestamp);
  }
}