import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroStarSolid } from '@ng-icons/heroicons/solid';
import {
  heroCog6Tooth,
  heroBell,
  heroMagnifyingGlass,
  heroPlus,
  heroTrophy,
  heroStar,
  heroBookOpen,
  heroCalendar,
  heroCheck,
  heroCube,
  heroLightBulb,
  heroInformationCircle,
  heroExclamationTriangle,
  heroPencilSquare,
  heroShare,
  heroXMark,
  heroAcademicCap,
  heroRocketLaunch,
  heroChevronRight,
  heroClipboardDocumentList,
  heroWrenchScrewdriver,
  heroMap,
  heroTrash,
} from '@ng-icons/heroicons/outline';
import { ExperienceService } from '../../core/services/experience.service';
import { Ai } from '../../core/services/ai';
import { Navbar } from '../../shared/navbar/navbar';
import { AuthService } from '../../core/services/auth.service';

// ── Interfaces ──

interface PlanStage {
  etap: string;
  cel_glowny: string;
  umiejetnosci: {
    twarde: string[];
    miekkie: string[];
  };
  zasoby_edukacyjne: string[];
  projekt_portfolio: {
    nazwa: string;
    opis: string;
    kryteria_akceptacji: string[];
  };
  wskazniki_sukcesu_kpi: string[];
}

interface PlanData {
  podsumowanie_profilu: string;
  szacowany_czas_tygodniowo: string;
  plan: PlanStage[];
}

interface UserPlan {
  _id: string;
  userId: string;
  status: string;
  customTitle?: string;
  planData: PlanData;
  createdAt: string;
}

// ── Component ──

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgIconComponent, Navbar, DragDropModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  providers: [
    provideIcons({
      heroCog6Tooth,
      heroBell,
      heroMagnifyingGlass,
      heroPlus,
      heroTrophy,
      heroStar,
      heroStarSolid,
      heroBookOpen,
      heroCalendar,
      heroCheck,
      heroCube,
      heroLightBulb,
      heroInformationCircle,
      heroExclamationTriangle,
      heroPencilSquare,
      heroShare,
      heroXMark,
      heroAcademicCap,
      heroRocketLaunch,
      heroChevronRight,
      heroClipboardDocumentList,
      heroWrenchScrewdriver,
      heroMap,
      heroTrash,
    }),
  ],
})
export class Dashboard implements OnInit {

  constructor(
    private router: Router,
    private experienceService: ExperienceService,
    private aiService: Ai,
    private authService: AuthService
  ) { }


  // lvl

  level = signal(1);
  levelLabel = signal('Początkujący');
  levelProgress = signal(0);
  xpCurrent = signal(0);
  xpMax = signal(0);

  // plany
  sourcePlans = signal<UserPlan[]>([]);
  selectedPlan = signal<UserPlan | null>(null);
  plansLoading = signal(true);
  showAllPlans = signal(false);

  planTasks = signal<any[]>([]);
  openedTaskCell = signal<any | null>(null);
  openedTaskDiff = signal<string | null>(null);
  isLoadingTasks = signal(false);

  visiblePlans = computed(() => {
    const plans = this.sourcePlans();
    if (!this.showAllPlans() && plans.length > 6) {
      return plans.slice(0, 6);
    }
    return plans;
  })

  plansGenerated = signal(0);
  async ngOnInit() {
    this.isLoadingTasks.set(true);
    try {
      const hasToken = await this.authService.ensureAccessToken();
      if (!hasToken) {
        this.plansLoading.set(false);
        this.isLoadingTasks.set(false);
        return;
      }


      try {
        const progress = await this.experienceService.getProgress();
        this.updateExperienceUI(progress);
      } catch (error) {
        console.error('Błąd podczas pobierania postępów:', error);
      }

      const userPlans = await this.aiService.getUserPlans();
      if (userPlans && userPlans.length > 0) {
        const savedOrder = localStorage.getItem('dashboard_plans_order');
        if (savedOrder) {
          try {
            const orderedIds = JSON.parse(savedOrder);
            userPlans.sort((a, b) => {
              const idxA = orderedIds.indexOf(a._id);
              const idxB = orderedIds.indexOf(b._id);
              if (idxA === -1 && idxB === -1) return 0;
              if (idxA === -1) return 1;
              if (idxB === -1) return -1;
              return idxA - idxB;
            });
          } catch (e) { }
        }

        this.sourcePlans.set(userPlans);
        this.plansGenerated.set(userPlans.length);
        this.loadDashboardTasks(userPlans);
      }
    } catch (error) {
      console.error('Błąd podczas inicjalizacji dashboardu:', error);
    } finally {
      this.plansLoading.set(false);
      this.isLoadingTasks.set(false);
    }
  }

  openRoadmapGraph(planId: string) {
    this.router.navigate(['/ai/roadmap', planId]);
  }

  openPlan(plan: UserPlan): void {
    this.selectedPlan.set(plan);
  }

  loadDashboardTasks(plans: UserPlan[]): void {
    let allTasks: any[] = [];
    for (const plan of plans) {
      const title = this.getPlanTitle(plan);

      // Próba wczytania po ID (nowy sposób) lub po tytule (stary sposób / fallback)
      let saved = localStorage.getItem(`roadmap_state_${plan._id}`);
      if (!saved) {
        saved = localStorage.getItem(`roadmap_state_${title}`);
      }

      if (saved) {
        try {
          const state = JSON.parse(saved);
          const gridCells = state.gridCells || [];
          const cells = gridCells.filter((c: any) => {
            if (c.empty || !c.data) return false;
            const isFullySolved = this.isDifficultySolved(c, 'Łatwy') &&
              this.isDifficultySolved(c, 'Średni') &&
              this.isDifficultySolved(c, 'Trudny');
            return !isFullySolved;
          });
          const tasksWithPlan = cells.map((c: any) => ({ ...c, _planTitle: title, _planId: plan._id }));
          allTasks = allTasks.concat(tasksWithPlan);
        } catch (e) {
          console.error("Błąd wczytywania zadań dla planu:", plan._id, e);
        }
      }
    }
    this.planTasks.set(allTasks.slice(0, 6)); // Limit to 6 tasks for now
    this.openedTaskCell.set(null);
    this.openedTaskDiff.set(null);
  }

  isDifficultySolved(cell: any, diff: string): boolean {
    if (!cell?.data?.levelProgress?.[diff]?.tasksLoaded) return false;
    const p = cell.data.levelProgress[diff];
    if ((p.closedTasksDone?.length || 0) === 0 && (p.openTasksDone?.length || 0) === 0) return false;
    const closedCompleted = p.closedTasksDone.every((x: boolean) => x === true);
    const openCompleted = p.openTasksDone.every((x: boolean) => x === true);
    return closedCompleted && openCompleted;
  }

  switchTaskTab(cell: any, tab: 'cele' | 'zadania') {
    if (!cell._planId) return;
    this.router.navigate(['/ai/roadmap', cell._planId], {
      queryParams: {
        topic: cell.data.title,
        tab: tab
      }
    });
  }

  async toggleDashboardTasks(cell: any, difficulty: string) {
    if (!cell._planId) return;

    // Przenosimy użytkownika do roadmapy z parametrami, aby otworzyć konkretny temat
    this.router.navigate(['/ai/roadmap', cell._planId], {
      queryParams: {
        topic: cell.data.title,
        diff: difficulty
      }
    });
  }

  savePlanTasks(cell: any) {
    const title = cell._planTitle;
    if (!title) return;
    const saved = localStorage.getItem(`roadmap_state_${title}`);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        state.gridCells.forEach((c: any) => {
          if (!c.empty && c.data && c.data.title === cell.data.title) {
            c.data = cell.data;
          }
        });
        localStorage.setItem(`roadmap_state_${title}`, JSON.stringify(state));
      } catch (e) { }
    }
  }

  closePlan(): void {
    this.selectedPlan.set(null);
  }

  getPlanDate(plan: UserPlan): string {
    return plan.createdAt
      ? new Date(plan.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
  }

  getPlanTitle(plan: UserPlan): string {
    if (plan.customTitle) {
      return plan.customTitle;
    }
    const stages = plan.planData?.plan;
    if (stages && stages.length > 0) {
      const firstStage = stages[0].etap;
      const colonIdx = firstStage.indexOf(':');
      if (colonIdx !== -1) {
        const rest = firstStage.substring(colonIdx + 1).trim();
        const commaIdx = rest.indexOf(',');
        return commaIdx !== -1 ? rest.substring(0, commaIdx).trim() : rest;
      }
    }
    return 'Plan rozwoju';
  }

  getTotalKpis(plan: UserPlan): number {
    return plan.planData?.plan?.reduce((acc, stage) => acc + (stage.wskazniki_sukcesu_kpi?.length || 0), 0) || 0;
  }

  navigateToNewPlan(): void {
    this.router.navigate(['/ai/ask']);
  }

  showMorePlans(): void {
    this.showAllPlans.set(true);
  }

  onDropPlan(event: CdkDragDrop<UserPlan[]>): void {
    const plans = [...this.sourcePlans()];
    moveItemInArray(plans, event.previousIndex, event.currentIndex);
    this.sourcePlans.set(plans);

    // Save order to localStorage
    const orderedIds = plans.map(p => p._id);
    localStorage.setItem('dashboard_plans_order', JSON.stringify(orderedIds));
  }

  async deletePlan(event: Event, planId: string): Promise<void> {
    event.stopPropagation(); // Zapobiega otwarciu planu przy kliknięciu w ikonę usuwania

    const result = await Swal.fire({
      title: 'Czy na pewno?',
      text: 'Ten plan zostanie trwale usunięty z bazy danych.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--ih-accent)',
      cancelButtonColor: 'var(--ih-border-dark)',
      confirmButtonText: 'Tak, usuń!',
      cancelButtonText: 'Anuluj',
      background: 'var(--ih-bg-soft)',
      color: 'var(--ih-surface)'
    });

    if (result.isConfirmed) {
      try {
        await this.aiService.deleteUserPlan(planId);

        // Aktualizacja lokalnego stanu
        const updatedPlans = this.sourcePlans().filter(p => p._id !== planId);
        this.sourcePlans.set(updatedPlans);
        this.plansGenerated.set(updatedPlans.length);

        // Przeładowanie zadań na dashboardzie
        this.loadDashboardTasks(updatedPlans);

        Swal.fire({
          title: 'Usunięto!',
          text: 'Twój plan został pomyślnie usunięty.',
          icon: 'success',
          confirmButtonColor: 'var(--ih-accent)',
          background: 'var(--ih-bg-soft)',
          color: 'var(--ih-surface)'
        });
      } catch (error) {
        console.error('Błąd podczas usuwania planu:', error);
        Swal.fire({
          title: 'Błąd!',
          text: 'Nie udało się usunąć planu. Spróbuj ponownie.',
          icon: 'error',
          confirmButtonColor: 'var(--ih-accent)',
          background: 'var(--ih-bg-soft)',
          color: 'var(--ih-surface)'
        });
      }
    }
  }
  // edytowanie planów nazw
  async editPlanTitle(event: Event, plan: UserPlan): Promise<void> {
    event.stopPropagation();

    const { value: newTitle } = await Swal.fire({
      title: 'Zmień nazwę planu',
      input: 'text',
      inputValue: this.getPlanTitle(plan),
      showCancelButton: true,
      confirmButtonText: 'Zapisz',
      cancelButtonText: 'Anuluj',
      confirmButtonColor: 'var(--ih-accent)',
      background: 'var(--ih-bg-soft)',
      color: 'var(--ih-surface)',
      inputValidator: (value) => {
        if (!value) {
          return 'Nazwa nie może być pusta!';
        }
        return null;
      }
    });

    if (newTitle) {
      try {
        await this.aiService.updatePlanTitle(plan._id, newTitle);
        const updatedPlans = this.sourcePlans().map(p => {
          if (p._id === plan._id) {
            return { ...p, customTitle: newTitle };
          }
          return p;
        });
        this.sourcePlans.set(updatedPlans);

        Swal.fire({
          title: 'Zaktualizowano!',
          text: 'Nazwa planu została zmieniona.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: 'var(--ih-bg-soft)',
          color: 'var(--ih-surface)'
        });
      } catch (error) {
        console.error('Błąd podczas zmiany nazwy:', error);
        Swal.fire({
          title: 'Błąd!',
          text: 'Nie udało się zmienić nazwy.',
          icon: 'error',
          confirmButtonColor: 'var(--ih-accent)',
          background: 'var(--ih-bg-soft)',
          color: 'var(--ih-surface)'
        });
      }
    }
  }

  async testAddExp(amount: number) {
    try {
      const progress = await this.experienceService.addExperience(amount);
      this.updateExperienceUI(progress);
    } catch (e) {
      console.error('Błąd testowego dodawania EXP:', e);
    }
  }

  async testRemoveExp(amount: number) {
    try {
      const progress = await this.experienceService.removeExperience(amount);
      this.updateExperienceUI(progress);
    } catch (e) {
      console.error('Błąd testowego odejmowania EXP:', e);
    }
  }

  private updateExperienceUI(progress: any) {
    this.level.set(progress.level);
    this.levelProgress.set(progress.progressPercent);
    this.xpCurrent.set(progress.experience);
    this.xpMax.set(progress.xpForNextLevel);

    const lvl = progress.level;
    if (lvl >= 30) {
      this.levelLabel.set('Mistrz');
    } else if (lvl >= 19) {
      this.levelLabel.set('Ekspert');
    } else if (lvl >= 13) {
      this.levelLabel.set('Specjalista');
    } else if (lvl >= 8) {
      this.levelLabel.set('Praktykant');
    } else if (lvl >= 4) {
      this.levelLabel.set('Amator');
    } else {
      this.levelLabel.set('Nowicjusz');
    }
  }
}
