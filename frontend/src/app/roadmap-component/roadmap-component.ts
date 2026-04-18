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
  totalScore: number = 0;
  pointsPerDifficulty: { [key: string]: number } = { 'Łatwy': 0, 'Średni': 0, 'Trudny': 0 };

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

      this.selectedPlan = plan;
      this.careerPath = this.getPlanTitle(plan);
      
      // Spróbuj wczytać z localStorage, jeśli nie ma - inicjalizuj
      if (!this.loadFromLocalStorage()) {
        await this.initializeGraph();
      }

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

  async initializeGraph() {
    this.isGenerating = true;
    const totalCells = 150;
    this.gridCells = Array(totalCells).fill(null).map(() => ({ empty: true, data: null }));
    this.topicStack = [];
    this.currentLevel = 1;

    try {
      const res = await this.ai.getHexagonConcepts(this.careerPath, this.currentLevel).toPromise();
      const concepts = res?.concepts || [];

      let allTopics = concepts.map(c => ({
        ...c,
        loading: false,
        completed: false,
        tasksLoaded: false,
        levelProgress: {
          'Łatwy': { tasksLoaded: false, closedTasks: [], openTasks: [], closedTasksDone: [], openTasksDone: [], openTasksScores: [] },
          'Średni': { tasksLoaded: false, closedTasks: [], openTasks: [], closedTasksDone: [], openTasksDone: [], openTasksScores: [] },
          'Trudny': { tasksLoaded: false, closedTasks: [], openTasks: [], closedTasksDone: [], openTasksDone: [], openTasksScores: [] }
        },
        selectedDifficulty: ''
      }));

      if (allTopics.length > 0) {
        this.gridCells[30] = {
          empty: false,
          data: allTopics[0]
        };
        this.topicStack = allTopics.slice(1);
      }
      this.isGenerating = false;
      this.cdr.detectChanges();
    } catch(err: any) {
      console.error("Błąd generowania pierwszego poziomu:", err);
      if (err.status === 503) {
        this.errorMessage = "Serwery AI są aktualnie przeciążone (Błąd 503). Proszę odśwież za chwilę.";
      } else {
        this.errorMessage = "Nie udało się wygenerować zadań. Spróbuj ponownie później.";
      }
      this.isGenerating = false;
      this.cdr.detectChanges();
    }
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

  unlockNeighbors(index: number) {
    const neighbors = this.getNeighborIndices(index);
    for (const nIdx of neighbors) {
      if (this.gridCells[nIdx].empty && this.topicStack.length > 0) {
        const nextTopic = this.topicStack.shift();
        this.gridCells[nIdx] = {
          empty: false,
          data: { ...nextTopic, loading: false, completed: false }
        };
      }
    }

    this.checkAndFetchMoreTopics();
    this.cdr.detectChanges();
  }

  async checkAndFetchMoreTopics() {
    if (this.topicStack.length < 6 && !this.isFetchingExtra && this.currentLevel < 10) {
      this.isFetchingExtra = true;
      this.currentLevel++;
      try {
        const usedTopics = this.gridCells.filter(c => !c.empty).map(c => c.data.title);
        const res = await this.ai.getHexagonConcepts(this.careerPath, this.currentLevel, usedTopics).toPromise();
        const concepts = res?.concepts || [];
        
        const newTopics = concepts.map(c => ({
          ...c,
          loading: false,
          completed: false,
          tasksLoaded: false,
          levelProgress: {
            'Łatwy': { tasksLoaded: false, closedTasks: [], openTasks: [], closedTasksDone: [], openTasksDone: [], openTasksScores: [] },
            'Średni': { tasksLoaded: false, closedTasks: [], openTasks: [], closedTasksDone: [], openTasksDone: [], openTasksScores: [] },
            'Trudny': { tasksLoaded: false, closedTasks: [], openTasks: [], closedTasksDone: [], openTasksDone: [], openTasksScores: [] }
          },
          selectedDifficulty: ''
        }));

        this.topicStack.push(...newTopics);
      } catch (err: any) {
        console.error("Błąd uzupełniania topicStack:", err);
        if (err.status === 503) {
           alert("Serwery AI są przeciążone, doczytywanie kolejnych hexów nie powiodło się.");
        }
        this.currentLevel--; // revert
      } finally {
        this.isFetchingExtra = false;
      }
    }
  }

  saveToLocalStorage() {
    const state = {
      gridCells: this.gridCells,
      totalScore: this.totalScore,
      pointsPerDifficulty: this.pointsPerDifficulty,
      topicStack: this.topicStack,
      currentLevel: this.currentLevel,
      careerPath: this.careerPath
    };
    localStorage.setItem(`roadmap_state_${this.careerPath}`, JSON.stringify(state));
  }

  loadFromLocalStorage(): boolean {
    const saved = localStorage.getItem(`roadmap_state_${this.careerPath}`);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.gridCells = state.gridCells;
        this.totalScore = state.totalScore || 0;
        this.pointsPerDifficulty = state.pointsPerDifficulty || { 'Łatwy': 0, 'Średni': 0, 'Trudny': 0 };
        this.topicStack = state.topicStack || [];
        this.currentLevel = state.currentLevel || 1;
        this.isGenerating = false;
        this.cdr.detectChanges();
        return true;
      } catch (e) {
        console.error("Błąd wczytywania stanu:", e);
      }
    }
    return false;
  }

  saveCurrentState() {
    this.saveToLocalStorage();
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


  selectedCellIndex: number = -1;
  isSelectingDifficulty: boolean = false;
  isLoadingTasks: boolean = false;
  
  openTaskAnswers: string[] = [];
  openTaskFeedbacks: string[] = [];
  isVerifyingOpenTask: boolean[] = [];
  closedTasksError: boolean[] = [];

  openCellModal(cell: any, index: number) {
    if (cell.empty || cell.data.loading) return;

    this.selectedCell = cell;
    this.selectedCellIndex = index;
    
    // Zawsze startujemy od wyboru trudności, chyba że już jakąś wybraliśmy w tej sesji modalu
    this.isSelectingDifficulty = !cell.data.selectedDifficulty;
    this.isLoadingTasks = false;

    if (cell.data.selectedDifficulty) {
      this.setupModalForDifficulty(cell.data.selectedDifficulty);
    }
  }

  setupModalForDifficulty(diff: string) {
    const progress = this.selectedCell.data.levelProgress[diff];
    this.openTaskAnswers = (progress.openTasks || []).map(() => '');
    this.openTaskFeedbacks = (progress.openTasks || []).map(() => '');
    this.isVerifyingOpenTask = (progress.openTasks || []).map(() => false);
    this.closedTasksError = (progress.closedTasks || []).map(() => false);
  }

  goBackToDifficultySelection() {
    if (this.selectedCell) {
      this.selectedCell.data.selectedDifficulty = '';
      this.isSelectingDifficulty = true;
    }
  }

  closeCellModal() {
    this.selectedCell = null;
    this.selectedCellIndex = -1;
  }

  async onDifficultyClick(difficulty: string) {
    if (!this.selectedCell) return;
    
    this.isSelectingDifficulty = false; 
    
    // Jeśli zadania dla tej trudności są już w pamięci - nie strzelaj do AI
    if (this.selectedCell.data.levelProgress[difficulty].tasksLoaded) {
      this.selectedCell.data.selectedDifficulty = difficulty;
      this.setupModalForDifficulty(difficulty);
      this.isLoadingTasks = false;
      return;
    }

    try {
      const topicTitle = this.selectedCell.data.title;
      const res = await this.ai.generateTasksForTopic(topicTitle, difficulty).toPromise();
      
      if (res) {
        const progress = this.selectedCell.data.levelProgress[difficulty];
        progress.closedTasks = res.closedTasks || [];
        progress.openTasks = res.openTasks || [];
        progress.tasksLoaded = true;
        
        this.selectedCell.data.selectedDifficulty = difficulty;
        
        // Inicjalizacja stanów wykonania dla tej trudności
        progress.closedTasksDone = progress.closedTasks.map(() => false);
        progress.openTasksDone = progress.openTasks.map(() => false);
        progress.openTasksScores = progress.openTasks.map(() => 0);
        
        this.setupModalForDifficulty(difficulty);
        this.saveToLocalStorage();
      }
    } catch(err) {
      console.error(err);
      alert('Nie udało się wygenerować zadań, spróbuj ponownie');
      this.isSelectingDifficulty = true; 
    } finally {
      this.isLoadingTasks = false;
      this.cdr.detectChanges();
    }
  }

  onClosedTaskSubmit(taskIdx: number, selectedIndex: number) {
    const diff = this.selectedCell.data.selectedDifficulty;
    const progress = this.selectedCell.data.levelProgress[diff];

    if (!this.selectedCell || progress.closedTasksDone[taskIdx]) return;
    const correct = progress.closedTasks[taskIdx]?.correctAnswer;
    
    if (selectedIndex === correct) {
      progress.closedTasksDone[taskIdx] = true;
      this.closedTasksError[taskIdx] = false;
      
      // Punktacja: +1 za quiz
      this.totalScore += 1;
      this.pointsPerDifficulty[diff] += 1;
      
      this.checkCellCompletion();
      this.saveToLocalStorage();
    } else {
      this.closedTasksError[taskIdx] = true;
    }
  }

  async onOpenTaskSubmit(taskIdx: number) {
    const diff = this.selectedCell.data.selectedDifficulty;
    const progress = this.selectedCell.data.levelProgress[diff];

    if (!this.selectedCell || !this.openTaskAnswers[taskIdx]?.trim() || progress.openTasksDone[taskIdx]) return;

    this.isVerifyingOpenTask[taskIdx] = true;
    this.openTaskFeedbacks[taskIdx] = '';

    try {
      const challenge = progress.openTasks[taskIdx]?.challenge;
      const res = await this.ai.verifyOpenTask(challenge, this.openTaskAnswers[taskIdx]).toPromise();
      
      const score = res?.score ?? 0;
      progress.openTasksScores[taskIdx] = score;
      
      if (score > 0) {
        progress.openTasksDone[taskIdx] = true;
        this.openTaskFeedbacks[taskIdx] = `Wynik: ${score}/2 pkt. ${res?.feedback}`;
        
        // Aktualizacja globalnych punktów
        this.totalScore += score;
        this.pointsPerDifficulty[diff] = (this.pointsPerDifficulty[diff] || 0) + score;

        this.checkCellCompletion();
        this.saveToLocalStorage();
      } else {
        this.openTaskFeedbacks[taskIdx] = `Wynik: 0/2 pkt. Spróbuj ponownie: ${res?.feedback}`;
      }
    } catch (e) {
      console.error(e);
      this.openTaskFeedbacks[taskIdx] = 'Błąd weryfikacji. Spróbuj później.';
    } finally {
      this.isVerifyingOpenTask[taskIdx] = false;
      this.cdr.detectChanges();
    }
  }

  checkCellCompletion() {
    const diff = this.selectedCell.data.selectedDifficulty;
    const progress = this.selectedCell.data.levelProgress[diff];

    const closedAllDone = progress.closedTasksDone.every((c: boolean) => c === true);
    const openAllDone = progress.openTasksDone.every((c: boolean) => c === true);

    if (closedAllDone && openAllDone) {
      // Heks jest "zaliczone" jeśli ukończono JAKIKOLWIEK poziom trudności chociaż raz
      if (!this.selectedCell.data.completed) {
        this.selectedCell.data.completed = true;
        setTimeout(() => {
          alert(`Poziom ${diff} ukończony! Zdobyto punkty. Heks zaliczony!`);
          this.unlockNeighbors(this.selectedCellIndex);
          this.saveToLocalStorage();
        }, 500);
      } else {
        // Heks był już zaliczony, po prostu informujemy o kolejnym poziomie
        setTimeout(() => {
          alert(`Poziom ${diff} ukończony! Punkty dodane.`);
          this.saveToLocalStorage();
        }, 500);
      }
    }
  }

  ngOnDestroy() {
    if (this.streamSub) {
      this.streamSub.unsubscribe();
    }

    this.saveCurrentState();
  }
}