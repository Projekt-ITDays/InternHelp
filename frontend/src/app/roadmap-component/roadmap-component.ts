import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Ai } from '../service/ai';

@Component({
  selector: 'app-roadmap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roadmap-component.html',
  styleUrl: './roadmap-component.css' 
})
export class RoadmapComponent implements OnInit {
  careerPath: string = '';
  roadmapContent: string = '';
  isGenerating: boolean = true;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ai: Ai,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const pathParam = this.route.snapshot.paramMap.get('careerPath');
    this.careerPath = pathParam ? decodeURIComponent(pathParam) : 'Nieznana ścieżka';
    
    this.generateRoadmap();
  }

  generateRoadmap() {
    this.isGenerating = true;
    this.roadmapContent = '';
    
    this.ai.streamRoadmap(this.careerPath).subscribe({
      // Paczki danych z backendu będą tutaj na żywo
      next: (chunk: string) => {
        this.roadmapContent += chunk; 
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Błąd streamingu:', err);
        this.errorMessage = 'Coś poszło nie tak podczas generowania mapy.';
        this.isGenerating = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isGenerating = false;
        this.cdr.detectChanges();
      }
    });
  }

  goBack() {
    this.router.navigate(['/ai/ask']);
  }
}
