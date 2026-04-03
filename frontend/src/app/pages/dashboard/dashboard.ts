import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
} from '@ng-icons/heroicons/outline';
import { ExperienceService } from '../../service/experience.service';
import { Ai } from '../../service/ai';
import { Navbar } from '../../layout/navbar/navbar';
import { NotificationService } from '../../service/notification.service';

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
  planData: PlanData;
  createdAt: string;
}

// ── Component ──

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, NgIconComponent, Navbar],
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
    }),
  ],
})
export class Dashboard implements OnInit {

  private notificationService = inject(NotificationService);
  notifications = this.notificationService.notifications;

  constructor(
    private router: Router,
    private experienceService: ExperienceService,
    private aiService: Ai
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

  visiblePlans = computed(() => {
    const plans = this.sourcePlans();
    if (!this.showAllPlans() && plans.length > 6) {
      return plans.slice(0, 6);
    }
    return plans;
  })

  plansGenerated = signal(0);
  async ngOnInit() {
    try {
      const progress = await this.experienceService.getProgress();
      this.level.set(progress.level);
      this.levelProgress.set(progress.progressPercent);
      this.xpCurrent.set(progress.experience);
      this.xpMax.set(progress.xpForNextLevel);

      if (progress.level >= 20) {
        this.levelLabel.set('Ekspert');
      } else if (progress.level >= 10) {
        this.levelLabel.set('Zaawansowany');
      } else {
        this.levelLabel.set('Początkujący');
      }
    } catch (error) {
      console.error('Błąd podczas pobierania postępów:', error);
    }

    try {
      const userPlans = await this.aiService.getUserPlans();
      if (userPlans && userPlans.length > 0) {
        this.sourcePlans.set(userPlans);
        this.plansGenerated.set(userPlans.length);
      }
    } catch (error) {
      console.error('Błąd podczas pobierania planów:', error);
    } finally {
      this.plansLoading.set(false);
    }
  }

  openPlan(plan: UserPlan): void {
    this.selectedPlan.set(plan);
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
}
