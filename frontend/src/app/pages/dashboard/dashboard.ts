import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PlansStore } from '../../core/plans.store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly plansStore = inject(PlansStore);
  private readonly router = inject(Router);
  private readonly isHovered = signal(false);
  private readonly isMobileMenuOpen = signal(false);

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

  protected get canCreatePlan(): boolean {
    return this.plans().length < 5;
  }

  protected get forceExpanded(): boolean {
    return this.plans().length === 0;
  }

  protected get isMenuExpanded(): boolean {
    return this.forceExpanded || this.isHovered() || this.isMobileMenuOpen();
  }

  protected isMobileOpen(): boolean {
    return this.isMobileMenuOpen();
  }

  protected onMenuEnter(): void {
    this.isHovered.set(true);
  }

  protected onMenuLeave(): void {
    if (this.forceExpanded) {
      return;
    }

    this.isHovered.set(false);
  }

  protected onMenuTriggerClick(): void {
    this.isMobileMenuOpen.update((value) => !value);
  }

  protected onDeletePlan(planId: number): void {
    this.plansStore.deletePlan(planId);
  }

  protected onDeletePlanClick(planId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.onDeletePlan(planId);
  }

  protected onSelectPlan(planId: number): void {
    this.plansStore.selectPlan(planId);
  }

  protected onOpenSettings(): void {
    void this.router.navigate(['/settings']);
  }
}
