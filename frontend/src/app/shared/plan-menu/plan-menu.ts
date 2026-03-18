import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlanSummary } from '../../core/plan.model';

@Component({
  selector: 'app-plan-menu',
  imports: [RouterLink],
  templateUrl: './plan-menu.html',
  styleUrl: './plan-menu.css',
})
export class PlanMenu {
  @Input({ required: true }) plans: PlanSummary[] = [];
  @Input() selectedPlanId: number | null = null;
  @Input() currentPage: 'dashboard' | 'settings' = 'dashboard';

  @Output() selectPlan = new EventEmitter<number>();
  @Output() deletePlan = new EventEmitter<number>();
  @Output() createPlan = new EventEmitter<void>();

  private readonly isHovered = signal(false);

  protected get canCreatePlan(): boolean {
    return this.plans.length < 5;
  }

  protected get forceExpanded(): boolean {
    return this.plans.length === 0;
  }

  protected get isExpanded(): boolean {
    return this.forceExpanded || this.isHovered();
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

  protected onCreatePlan(): void {
    this.createPlan.emit();
  }

  protected onSelectPlan(planId: number): void {
    this.selectPlan.emit(planId);
  }

  protected onDeletePlan(planId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.deletePlan.emit(planId);
  }
}
