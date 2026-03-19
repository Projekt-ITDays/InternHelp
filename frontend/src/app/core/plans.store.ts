import { Injectable, signal } from '@angular/core';
import { PlanSummary } from './plan.model';

const INITIAL_PLAN_NUMBERS = [104, 128, 212];

@Injectable({ providedIn: 'root' })
export class PlansStore {
  private readonly plansState = signal<PlanSummary[]>(
    INITIAL_PLAN_NUMBERS.map((number, index) => ({ id: index + 1, number }))
  );
  private readonly selectedPlanIdState = signal<number | null>(this.plansState()[0]?.id ?? null);

  readonly plans = this.plansState.asReadonly();
  readonly selectedPlanId = this.selectedPlanIdState.asReadonly();

  selectPlan(planId: number): void {
    if (!this.plansState().some((plan) => plan.id === planId)) {
      return;
    }

    this.selectedPlanIdState.set(planId);
  }

  createPlan(): void {
    const currentPlans = this.plansState();
    if (currentPlans.length >= 5) {
      return;
    }

    const lastPlan = currentPlans[currentPlans.length - 1];
    const createdPlan: PlanSummary = {
      id: (lastPlan?.id ?? 0) + 1,
      number: (lastPlan?.number ?? 0) + 1,
    };

    this.plansState.set([...currentPlans, createdPlan]);
    this.selectedPlanIdState.set(createdPlan.id);
  }

  deletePlan(planId: number): void {
    const currentPlans = this.plansState();
    if (!currentPlans.some((plan) => plan.id === planId)) {
      return;
    }

    const updatedPlans = currentPlans.filter((plan) => plan.id !== planId);
    this.plansState.set(updatedPlans);

    if (updatedPlans.length === 0) {
      this.selectedPlanIdState.set(null);
      return;
    }

    if (!updatedPlans.some((plan) => plan.id === this.selectedPlanIdState())) {
      this.selectedPlanIdState.set(updatedPlans[0].id);
    }
  }
}
