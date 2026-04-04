import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RoadmapStorageService, SavedRoadmap } from '../../service/roadmap-storage.service';

@Component({
  selector: 'app-roadmap-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roadmap-list.html',
  styleUrl: './roadmap-list.css'
})
export class RoadmapListComponent implements OnInit {
  savedRoadmaps: SavedRoadmap[] = [];

  constructor(
    private storage: RoadmapStorageService,
    private router: Router
  ) {}

  ngOnInit() {
    this.savedRoadmaps = this.storage.getAllRoadmapsAsArray();
  }

  goToRoadmap(careerPath: string) {
    this.router.navigate(['/ai/roadmap', encodeURIComponent(careerPath)]);
  }

  goToGenerator() {
    this.router.navigate(['/ai/ask']);
  }
}
