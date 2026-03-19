import { Component, inject } from '@angular/core';
import { PlansStore } from '../../core/plans.store';
import { PlanMenu } from '../../shared/plan-menu/plan-menu';
import { PageFrameShell } from '../../shared/page-frame/page-frame';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [PageFrameShell, PlanMenu],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly plansStore = inject(PlansStore);

  protected readonly plans = this.plansStore.plans;
  protected readonly selectedPlanId = this.plansStore.selectedPlanId;
  protected get selectedPlanNumber(): number | null {
    const selectedPlanId = this.selectedPlanId();
    if (selectedPlanId === null) {
      return null;
    }

    return this.plans().find((plan) => plan.id === selectedPlanId)?.number ?? null;
  }

  protected onCreatePlan(): void {
    this.plansStore.createPlan();
  }

  protected onDeletePlan(planId: number): void {
    this.plansStore.deletePlan(planId);
  }

  protected onSelectPlan(planId: number): void {
    this.plansStore.selectPlan(planId);
  }
}
