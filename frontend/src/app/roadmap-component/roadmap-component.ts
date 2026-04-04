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

  currentLevel: number = 1;
  topicStack: any[] = [];
  isFetchingExtra: boolean = false;

  // Interaction Modal state
  selectedCell: any | null = null;

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
  ) { }

  updateParsedContent() {
    // Używamy DomSanitizer aby bezpiecznie bindować wyrenderowany przez marked HTML do [innerHTML]
    const html = marked.parse(this.roadmapContent) as string;
    this.parsedRoadmapContent = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  ngOnInit() {
    const pathParam = this.route.snapshot.paramMap.get('careerPath');
    console.log('pathParam', pathParam);
    this.careerPath = pathParam ? decodeURIComponent(pathParam) : 'Twoja Ścieżka';
    console.log('careerPath', this.careerPath);

    const saved = this.storage.getRoadmap(this.careerPath);
    if (saved) {
      this.currentLevel = saved.currentLevel || 1;
      this.roadmapContent = saved.roadmapContent;
      this.updateParsedContent();
      this.gridCells = saved.gridCells;
      this.isGenerating = false;
      return;
    }

    // Generujemy siatkę ze szkieletem (skeleton) na czas ładowania z AI
    const totalCells = 150;
    const activePositions = [62, 63, 64, 65, 71, 72, 73, 80, 81, 82];

    for (let i = 0; i < totalCells; i++) {
      if (activePositions.includes(i)) {
        this.gridCells.push({
          empty: false,
          data: { title: '...', description: 'Generowanie konceptu...', loading: true }
        });
      } else {
        this.gridCells.push({
          empty: true,
          data: null
        });
      }
    }

    // generowanie tekstu roadmapy
    this.generateRoadmap();

    // koncepty do hexagonow (początkowe)
    this.fetchHexagonConcepts(true);
  }

  fetchHexagonConcepts(isInitial: boolean = true) {
    if (this.isFetchingExtra) return;
    this.isFetchingExtra = true;

    const exclude = this.gridCells
      .filter(cell => !cell.empty && cell.data && !cell.data.loading && cell.data.title !== '...')
      .map(cell => cell.data.title);

    this.ai.getHexagonConcepts(this.careerPath, this.currentLevel, exclude).subscribe({
      next: (res) => {
        this.isFetchingExtra = false;
        if (!res.concepts || res.concepts.length === 0) return;

        if (isInitial) {
          // bierzemy element jeden reszte usuwamy
          const firstTopic = res.concepts[0];
          const remainingTopics = res.concepts.slice(1);

          this.gridCells = this.gridCells.map((cell, idx) => {
            if (idx === 30) {
              return { empty: false, data: { ...firstTopic, loading: false, completed: false } };
            }
            return { empty: true, data: null };
          });

          this.topicStack = remainingTopics.map(t => ({ ...t, completed: false }));
        } else {

          const newTopics = res.concepts.map(t => ({ ...t, completed: false }));
          this.topicStack.push(...newTopics);
          // console.log(`${newTopics.length} nowych tematów rozmiar stosu: ${this.topicStack.length}`);
        }

        this.cdr.detectChanges();
        this.saveCurrentState();
      },
      error: (err) => {
        this.isFetchingExtra = false;
        console.error('Błąd pobierania', err);
        if (isInitial) {
          this.gridCells = this.gridCells.map(cell => {
            if (!cell.empty && cell.data?.loading) {
              cell.data = { title: 'Błąd AI', description: 'Brak', loading: false };
            }
            return cell;
          });
        }
        this.cdr.detectChanges();
      }
    });
  }

  getNeighborIndices(index: number): number[] {
    const rowPair = Math.floor(index / 17);
    const rem = index % 17;
    const isEven = rem < 9;
    const r = isEven ? rowPair * 2 : rowPair * 2 + 1;
    const c = isEven ? rem : rem - 9;

    const possibleNeighbors: [number, number][] = isEven
      ? [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]]
      : [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]];

    const indices: number[] = [];
    for (const [nr, nc] of possibleNeighbors) {
      const idx = this.coordsToIndex(nr, nc);
      if (idx !== -1 && idx < 150) {
        indices.push(idx);
      }
    }
    return indices;
  }
  // ostra matematyka
  coordsToIndex(r: number, c: number): number {
    if (r < 0 || c < 0) return -1;
    const rowPair = Math.floor(r / 2);
    const isOdd = r % 2 !== 0;
    if (isOdd) {
      if (c > 7) return -1;
      return rowPair * 17 + 9 + c;
    } else {
      if (c > 8) return -1;
      return rowPair * 17 + c;
    }
  }

  onCompleteTask(index: number, event: MouseEvent) {
    event.stopPropagation();

    const cell = this.gridCells[index];
    if (!cell || cell.empty || cell.data.completed) return;

    cell.data.completed = true;

    const neighbors = this.getNeighborIndices(index);
    for (const nIdx of neighbors) {
      // w sumie tego drugiego warunku nie trzeba bo zawsze dobieramy tematy
      // jak jest ich mniej niż 6.
      if (this.gridCells[nIdx].empty && this.topicStack.length > 0) {
        const nextTopic = this.topicStack.shift();
        this.gridCells[nIdx] = {
          empty: false,
          data: { ...nextTopic, loading: false, completed: false }
        };
      }
    }

    this.cdr.detectChanges();
    this.saveCurrentState();

    // doładowanie jak jest za mało tematów
    if (this.topicStack.length < 6 && this.currentLevel < 10 && !this.isFetchingExtra) {
      this.currentLevel++;
      // console.log(`więcej tematów, poziom ${this.currentLevel}`);
      this.fetchHexagonConcepts(false);
    }
  }

  saveCurrentState() {
    this.storage.saveRoadmap({
      careerPath: this.careerPath,
      roadmapContent: this.roadmapContent,
      gridCells: this.gridCells,
      timestamp: Date.now(),
      currentLevel: this.currentLevel
    });
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
          timestamp: Date.now(),
          currentLevel: this.currentLevel
        });
        this.cdr.detectChanges();
      }
    });
  }

  // Dragowanie myszki
  onMouseDown(e: MouseEvent) {
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.currentPanX = this.panX;
    this.currentPanY = this.panY;
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(e: MouseEvent) {
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (this.startX === 0 && this.startY === 0) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    if (!this.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      this.isDragging = true;
    }

    if (!this.isDragging) return;

    e.preventDefault();
    this.panX = this.currentPanX + dx;
    this.panY = this.currentPanY + dy;
  }

  goBack() {
    this.router.navigate(['/ai/roadmap']);
  }


  openCellModal(cell: any) {
    if (cell.empty || cell.data.loading) return;

    this.selectedCell = cell;
  }

  closeCellModal() {
    this.selectedCell = null;
  }

  onDifficultyClick(difficulty: string) {
    console.log(`Wybrano stopień trudności [${difficulty}] dla modułu:`, this.selectedCell?.data?.title);
    alert(`W przyszłości AI wygeneruje tutaj zagadnienia o poziomie: ${difficulty}`);
  }

  ngOnDestroy() {
    if (this.streamSub) {
      this.streamSub.unsubscribe();
    }

    if (this.careerPath) {
      this.storage.saveRoadmap({
        careerPath: this.careerPath,
        roadmapContent: this.roadmapContent || 'Wczytywanie przerwane...',
        gridCells: this.gridCells,
        timestamp: Date.now(),
        currentLevel: this.currentLevel
      });
    }
  }
}
