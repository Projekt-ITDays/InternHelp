import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-graduation-year-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graduation-year-picker.html',
  styleUrl: './graduation-year-picker.css',
})
export class GraduationYearPickerComponent {
  readonly currentYear = new Date().getFullYear();
  readonly minYear = this.currentYear - 21;
  readonly maxYear = this.currentYear + 8;
  readonly suggestedYears = [
    this.currentYear - 1,
    this.currentYear,
    this.currentYear + 1,
    this.currentYear + 2,
  ].filter((year) => year >= this.minYear && year <= this.maxYear);

  private _value = this.currentYear;

  @Input()
  set value(rawValue: number | string | null | undefined) {
    this._value = this.normalizeYear(Number(rawValue));
  }

  get value(): number {
    return this._value;
  }

  @Output() valueChange = new EventEmitter<number>();

  selectYear(candidate: number): void {
    const normalized = this.normalizeYear(candidate);
    if (normalized === this._value) {
      return;
    }

    this._value = normalized;
    this.valueChange.emit(normalized);
  }

  onSliderInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.selectYear(Number(target?.value));
  }

  private normalizeYear(rawValue: number): number {
    if (!Number.isFinite(rawValue)) {
      return this.currentYear;
    }

    return Math.min(this.maxYear, Math.max(this.minYear, Math.round(rawValue)));
  }
}