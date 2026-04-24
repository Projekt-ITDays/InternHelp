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
  readonly allowedValues = Array.from({ length: 12 }, (_, index) => index + 1);
  readonly keyClockValues = [3, 6, 9, 12];
  
  private _value = 6;
  protected previewValue: number | null = null;
  protected showHand = true;

  @Input()
  set value(rawValue: number | string | null | undefined) {
    this._value = Number(rawValue) || 6;
  }

  get value(): number { return this._value; }

  @Output() valueChange = new EventEmitter<number>();

  get displayValue(): number { return this.previewValue ?? this.value; }
  get handAngle(): number { return (this.displayValue % 12) * 30; }

  setPreview(candidate: number): void { this.previewValue = candidate; }
  clearPreview(): void { this.previewValue = null; }

  onDialClick(event: MouseEvent): void {
    const dial = event.currentTarget as HTMLElement;
    const rect = dial.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    
    const angle = (Math.atan2(offsetX, -offsetY) * 180) / Math.PI;
    const normalizedAngle = (angle + 360) % 360;
    
    let snapped = Math.round(normalizedAngle / 30) % 12;
    if (snapped === 0) snapped = 12;

    this._value = snapped;
    this.valueChange.emit(this._value);
    this.previewValue = null;
  }

  onDialHover(event: MouseEvent): void {
    const dial = event.currentTarget as HTMLElement;
    const rect = dial.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    
    const angle = (Math.atan2(offsetX, -offsetY) * 180) / Math.PI;
    const normalizedAngle = (angle + 360) % 360;
    
    let snapped = Math.round(normalizedAngle / 30) % 12;
    if (snapped === 0) snapped = 12;

    this.setPreview(snapped);
  }

  onMarkerClick(candidate: number, event: MouseEvent): void {
    event.stopPropagation();
    this._value = candidate;
    this.valueChange.emit(this._value);
    this.previewValue = null;
  }

  getMarkerLeft(value: number): string {
    return `${50 + Math.sin((value * 30 * Math.PI) / 180) * 39}%`;
  }

  getMarkerTop(value: number): string {
    return `${50 - Math.cos((value * 30 * Math.PI) / 180) * 39}%`;
  }

  isKeyClockValue(candidate: number): boolean {
    return this.keyClockValues.includes(candidate);
  }
}
