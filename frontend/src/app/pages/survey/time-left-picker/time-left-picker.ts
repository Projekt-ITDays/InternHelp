import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-time-left-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './time-left-picker.html',
  styleUrl: './time-left-picker.css',
})
export class TimeLeftPickerComponent {
  readonly minValue = 1;
  readonly maxValue = 12;
  readonly allowedValues = Array.from({ length: 12 }, (_, index) => index + 1);
  readonly keyClockValues = [3, 6, 9, 12];

  private readonly markerRadiusPercent = 39;
  private readonly centerDeadZonePercent = 28;

  private _value = 6;
  protected previewValue: number | null = null;
  protected pointerInDeadZone = false;

  @Input()
  set value(rawValue: number | string | null | undefined) {
    this._value = this.normalizeValue(Number(rawValue));
  }

  get value(): number {
    return this._value;
  }

  @Output() valueChange = new EventEmitter<number>();

  get displayValue(): number {
    return this.previewValue ?? this.value;
  }

  get handAngle(): number {
    return this.valueToAngle(this.displayValue);
  }

  get showHand(): boolean {
    return !this.pointerInDeadZone;
  }

  setPreview(candidate: number): void {
    this.pointerInDeadZone = false;
    this.previewValue = this.normalizeValue(candidate);
  }

  clearPreview(): void {
    this.previewValue = null;
    this.pointerInDeadZone = false;
  }

  onDialHover(event: MouseEvent): void {
    const pointerData = this.resolvePointerData(event);
    this.pointerInDeadZone = pointerData.inDeadZone;
    this.previewValue = pointerData.value;
  }

  onDialClick(event: MouseEvent): void {
    const pointerData = this.resolvePointerData(event);
    this.pointerInDeadZone = pointerData.inDeadZone;

    if (pointerData.value !== null) {
      this.selectValue(pointerData.value);
    }

    this.previewValue = null;
  }

  onMarkerClick(candidate: number, event: MouseEvent): void {
    event.stopPropagation();
    this.pointerInDeadZone = false;
    this.selectValue(candidate);
    this.previewValue = null;
  }

  getMarkerLeft(value: number): string {
    const radians = (this.valueToAngle(value) * Math.PI) / 180;
    return `${50 + Math.sin(radians) * this.markerRadiusPercent}%`;
  }

  getMarkerTop(value: number): string {
    const radians = (this.valueToAngle(value) * Math.PI) / 180;
    return `${50 - Math.cos(radians) * this.markerRadiusPercent}%`;
  }

  isKeyClockValue(candidate: number): boolean {
    return this.keyClockValues.includes(candidate);
  }

  private selectValue(candidate: number): void {
    const normalized = this.normalizeValue(candidate);
    if (normalized === this.value) {
      return;
    }

    this._value = normalized;
    this.valueChange.emit(normalized);
  }

  private resolvePointerData(event: MouseEvent): { value: number | null; inDeadZone: boolean } {
    const dial = event.currentTarget as HTMLElement | null;
    if (!dial) {
      return { value: this.value, inDeadZone: false };
    }

    const rect = dial.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    const radius = rect.width / 2;
    const distanceFromCenter = Math.hypot(offsetX, offsetY);
    const deadZoneRadius = radius * (this.centerDeadZonePercent / 100);

    if (distanceFromCenter <= deadZoneRadius) {
      return { value: null, inDeadZone: true };
    }

    const angle = (Math.atan2(offsetX, -offsetY) * 180) / Math.PI;
    const normalizedAngle = (angle + 360) % 360;
    const snapped = Math.round(normalizedAngle / 30) % 12;
    return { value: snapped === 0 ? 12 : snapped, inDeadZone: false };
  }

  private normalizeValue(rawValue: number): number {
    if (
      Number.isInteger(rawValue) &&
      rawValue >= this.minValue &&
      rawValue <= this.maxValue
    ) {
      return rawValue;
    }

    return 6;
  }

  private valueToAngle(value: number): number {
    return (value % 12) * 30;
  }
}
