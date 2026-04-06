import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Ai } from '../service/ai';
import { RoadmapStorageService } from '../service/roadmap-storage.service';
import { marked } from 'marked';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroInformationCircle,
  heroWrenchScrewdriver,
  heroAcademicCap,
  heroRocketLaunch,
  heroCheck,
  heroClipboardDocumentList,
  heroXMark
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-roadmap',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './roadmap-component.html',
  styleUrl: './roadmap-component.css',
  providers: [
    provideIcons({
      heroInformationCircle,
      heroWrenchScrewdriver,
      heroAcademicCap,
      heroRocketLaunch,
      heroCheck,
      heroClipboardDocumentList,
      heroXMark
    })
  ]
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
  selectedPlan: any | null = null;

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

  async ngOnInit() {
    const pathParam = this.route.snapshot.paramMap.get('careerPath');
    const planId = pathParam ? decodeURIComponent(pathParam) : '';

    if (!planId) return;

    try {
      const userPlans = await this.ai.getUserPlans();
      const plan = userPlans.find((p: any) => p._id === planId);

      if (!plan) {
        this.errorMessage = 'Nie znaleziono planu w bazie.';
        this.isGenerating = false;
        return;
      }

      this.careerPath = this.getPlanTitle(plan);

      const saved = this.storage.getRoadmap(planId);
      if (saved) {
        this.selectedPlan = plan;
        this.currentLevel = saved.currentLevel || 1;
        this.roadmapContent = saved.roadmapContent;
        this.updateParsedContent();
        this.gridCells = saved.gridCells;
        this.isGenerating = false;
        return;
      }

      this.renderPlan(plan);

    } catch (err) {
      console.error(err);
      this.errorMessage = 'Błąd pobierania danych planu z bazy.';
      this.isGenerating = false;
    }
  }

  getPlanTitle(plan: any): string {
    const stages = plan?.planData?.plan;
    if (stages && stages.length > 0) {
      const firstStage = stages[0].etap;
      const colonIdx = firstStage.indexOf(':');
      if (colonIdx !== -1) {
        const rest = firstStage.substring(colonIdx + 1).trim();
        const commaIdx = rest.indexOf(',');
        return commaIdx !== -1 ? rest.substring(0, commaIdx).trim() : rest;
      }
      return firstStage;
    }
    return 'Plan rozwoju';
  }

  getPlanDate(plan: any): string {
    return plan?.createdAt
      ? new Date(plan.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
  }

  renderPlan(plan: any) {
    this.selectedPlan = plan;
    const totalCells = 150;
    this.gridCells = Array(totalCells).fill(null).map(() => ({ empty: true, data: null }));

    const stages = plan.planData?.plan || [];
    let allTopics: any[] = [];

    stages.forEach((stage: any, sIdx: number) => {
      allTopics.push({
        title: `Etap ${sIdx + 1}`,
        description: stage.etap + " - " + stage.cel_glowny,
        loading: false,
        completed: false
      });
      if (stage.wskazniki_sukcesu_kpi) {
        stage.wskazniki_sukcesu_kpi.forEach((kpi: string) => {
          allTopics.push({
            title: kpi.length > 30 ? kpi.substring(0, 30) + '...' : kpi,
            description: kpi,
            loading: false,
            completed: false
          });
        });
      }
      if (stage.umiejetnosci?.twarde) {
        stage.umiejetnosci.twarde.forEach((skill: string) => {
          allTopics.push({
            title: skill,
            description: 'Wymagana umiejętność techniczna',
            loading: false,
            completed: false
          });
        });
      }
    });

    if (allTopics.length > 0) {
      this.gridCells[30] = {
        empty: false,
        data: allTopics[0]
      };
      this.topicStack = allTopics.slice(1);
    }

    this.isGenerating = false;
    this.cdr.detectChanges();
    this.saveCurrentState();
  }

  generatePlanMarkdown(plan: any): string {
    return '';
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
  }

  saveCurrentState() {
    if (!this.selectedPlan || !this.selectedPlan._id) return;
    this.storage.saveRoadmap({
      careerPath: this.selectedPlan._id,
      roadmapContent: this.roadmapContent,
      gridCells: this.gridCells,
      timestamp: Date.now(),
      currentLevel: this.currentLevel
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
    this.router.navigate(['/dashboard']);
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