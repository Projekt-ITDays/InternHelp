import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Ai } from '../service/ai';
import { RoadmapStorageService } from '../service/roadmap-storage.service';
import { marked } from 'marked';

@Component({
  selector: 'app-roadmap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roadmap-component.html',
  styleUrl: './roadmap-component.css' 
})
export class RoadmapComponent implements OnInit, OnDestroy {
  careerPath: string = '';
  roadmapContent: string = '';
  parsedRoadmapContent: SafeHtml = '';
  isGenerating: boolean = true;
  errorMessage: string = '';
  private streamSub: any;
  
  // Panning state
  isDragging = false;
  startX = 0;
  startY = 0;
  panX = 0;
  panY = 0;
  currentPanX = 0;
  currentPanY = 0;

  // Pełna siatka komórek
  gridCells: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ai: Ai,
    private cdr: ChangeDetectorRef,
    private storage: RoadmapStorageService,
    private sanitizer: DomSanitizer
  ) {}

  updateParsedContent() {
    // Używamy DomSanitizer aby bezpiecznie bindować wyrenderowany przez marked HTML do [innerHTML]
    const html = marked.parse(this.roadmapContent) as string;
    this.parsedRoadmapContent = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  ngOnInit() {
    const pathParam = this.route.snapshot.paramMap.get('careerPath');
    this.careerPath = pathParam ? decodeURIComponent(pathParam) : 'Twoja Ścieżka';

    const saved = this.storage.getRoadmap(this.careerPath);
    if (saved) {
      this.roadmapContent = saved.roadmapContent;
      this.updateParsedContent();
      this.gridCells = saved.gridCells;
      this.isGenerating = false;
      return;
    }

    // Rzeczywiste dane roadmapy (dummy fallback, do integracji z AI kiedyś)
    const roadmapNodes = [
      { id: 1, title: 'Podstawy', description: 'Zrozumienie kluczowych pojęć' },
      { id: 2, title: 'Programowanie', description: 'Nauka języka np. C++ lub Python' },
      { id: 3, title: 'Narzędzia', description: 'Git, Bash, Docker' },
      { id: 4, title: 'Struktury', description: 'Struktury danych i algorytmy' },
      { id: 5, title: 'Bazy danych', description: 'SQL i NoSQL' },
      { id: 6, title: 'Sieci', description: 'Protokoły, HTTP, TCP/IP' },
      { id: 7, title: 'Architektura', description: 'Wzorce projektowe' },
      { id: 8, title: 'Testowanie', description: 'Unit testing, TDD' },
      { id: 9, title: 'CI/CD', description: 'Automatyzacja, Jenkins' },
      { id: 10, title: 'Cloud', description: 'AWS, Azure, GCP' },
    ];

    // Generujemy bardzo dużą siatkę żeby było po czym jeździć (np. 150 elementów)
    const totalCells = 150; 
    let activeNodeIndex = 0;
    
    // Rozmieszczamy elementy na środku dłuższego gridu
    const activePositions = [62, 63, 64, 65, 71, 72, 73, 80, 81, 82]; 

    for (let i = 0; i < totalCells; i++) {
      if (activePositions.includes(i) && activeNodeIndex < roadmapNodes.length) {
        this.gridCells.push({
          empty: false,
          data: roadmapNodes[activeNodeIndex]
        });
        activeNodeIndex++;
      } else {
        this.gridCells.push({
          empty: true,
          data: null
        });
      }
    }
    
    this.generateRoadmap();
  }

  generateRoadmap() {
    this.isGenerating = true;
    this.roadmapContent = '';
    
    this.streamSub = this.ai.streamRoadmap(this.careerPath).subscribe({
      next: (chunk: string) => {
        this.roadmapContent += chunk; 
        this.updateParsedContent();
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
        this.storage.saveRoadmap({
          careerPath: this.careerPath,
          roadmapContent: this.roadmapContent,
          gridCells: this.gridCells,
          timestamp: Date.now()
        });
        this.cdr.detectChanges();
      }
    });
  }

  // --- DRAG / PANNING LOGIC ---
  onMouseDown(e: MouseEvent) {
    this.isDragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.currentPanX = this.panX;
    this.currentPanY = this.panY;
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.isDragging = false;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;
    e.preventDefault(); // prevents text selection during drag
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    this.panX = this.currentPanX + dx;
    this.panY = this.currentPanY + dy;
  }

  goBack() {
    this.router.navigate(['/ai/roadmap']);
  }

  ngOnDestroy() {
    // Odsubskrybuj, by stream nie chodził w tle
    if (this.streamSub) {
      this.streamSub.unsubscribe();
    }
    
    // Zapisz to, co zdążyło się wygenerować do ułamka sekundy w którym wyszliśmy!
    if (this.careerPath) {
      this.storage.saveRoadmap({
        careerPath: this.careerPath,
        roadmapContent: this.roadmapContent || 'Wczytywanie przerwane...',
        gridCells: this.gridCells,
        timestamp: Date.now()
      });
    }
  }
}
