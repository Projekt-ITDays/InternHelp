import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PlanSummary } from '../../core/plan.model';

@Component({
  selector: 'app-plan-menu',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './plan-menu.html',
  styleUrl: './plan-menu.css',
})
export class PlanMenu {
  private readonly router = inject(Router);

  @Input({ required: true }) plans: PlanSummary[] = [];
  @Input() selectedPlanId: number | null = null;
  @Input() currentPage: 'dashboard' | 'settings' = 'dashboard';

  @Output() selectPlan = new EventEmitter<number>();
  @Output() deletePlan = new EventEmitter<number>();
  @Output() createPlan = new EventEmitter<void>();

  private readonly isHovered = signal(false);
  private readonly isMobileMenuOpen = signal(false);
  private readonly pendingDeletePlanId = signal<number | null>(null);

  protected get canCreatePlan(): boolean {
    return this.plans.length < 5;
  }

  protected get forceExpanded(): boolean {
    return this.plans.length === 0;
  }

  protected get isExpanded(): boolean {
    return this.forceExpanded || this.isHovered() || this.isMobileMenuOpen();
  }

  protected get pendingDeletePlanNumber(): number | null {
    const pendingId = this.pendingDeletePlanId();
    if (pendingId === null) {
      return null;
    }

    return this.plans.find((plan) => plan.id === pendingId)?.number ?? null;
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

  protected onCreatePlan(): void {
    this.createPlan.emit();

    if (this.isMobileViewport() && !this.forceExpanded) {
      this.isMobileMenuOpen.set(false);
    }
  }

  protected onSelectPlan(planId: number): void {
    this.selectPlan.emit(planId);

    if (this.currentPage !== 'dashboard') {
      void this.router.navigate(['/dashboard']);
    }

    if (this.isMobileViewport() && !this.forceExpanded) {
      this.isMobileMenuOpen.set(false);
    }
  }

  protected onDeletePlan(planId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.pendingDeletePlanId.set(planId);
  }

  protected onCancelDeletePlan(): void {
    this.pendingDeletePlanId.set(null);
  }

  protected onConfirmDeletePlan(): void {
    const pendingId = this.pendingDeletePlanId();
    if (pendingId === null) {
      return;
    }

    this.deletePlan.emit(pendingId);
    this.pendingDeletePlanId.set(null);
  }

  private isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
  }
}
