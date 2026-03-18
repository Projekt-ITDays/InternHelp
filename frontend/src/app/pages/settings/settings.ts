import { Component, inject } from '@angular/core';
import { PlanMenu } from '../../shared/plan-menu/plan-menu';
import { PlansStore } from '../../core/plans.store';
import { PageFrameShell } from '../../shared/page-frame/page-frame';

@Component({
  selector: 'app-settings',
  imports: [PageFrameShell, PlanMenu],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly plansStore = inject(PlansStore);

  protected readonly plans = this.plansStore.plans;
  protected readonly selectedPlanId = this.plansStore.selectedPlanId;

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
