import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

interface HexagonStyle {
  id: number;
  leftPx: number;
  topPx: number;
  size: number;
  opacity: number;
  rotate: number;
  tint: string;
  blur: number;
  radius: number;
  centerX: number;
  centerY: number;
  animDuration: string;
  animDelay: string;
}

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './background.html',
  styleUrl: './background.css'
})
export class BackgroundComponent {
  protected hexagons: HexagonStyle[] = [];

  private readonly tintPalette = [
    'var(--ih-accent)',
    'var(--ih-success)',
    'var(--ih-skill-blue)',
    'var(--ih-surface-soft)'
  ];

  constructor() {
    this.randomizeBackground();
  }

  private randomizeBackground(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const viewportWidth = Math.max(window.innerWidth, 360);
    const viewportHeight = Math.max(window.innerHeight, 640);
    const targetCount = this.randomInt(10, 14);
    const placed: HexagonStyle[] = [];

    for (let id = 0; id < targetCount; id += 1) {
      const candidate = this.createNonOverlappingHexagon(id, placed, viewportWidth, viewportHeight);
      if (candidate) {
        placed.push(candidate);
      }
    }

    this.hexagons = placed;
  }

  private createNonOverlappingHexagon(
    id: number,
    existing: HexagonStyle[],
    viewportWidth: number,
    viewportHeight: number
  ): HexagonStyle | null {
    for (let attempt = 0; attempt < 140; attempt += 1) {
      const candidate = this.buildCandidate(id, viewportWidth, viewportHeight);
      if (this.canPlace(candidate, existing)) {
        return candidate;
      }
    }

    return null;
  }

  private buildCandidate(id: number, viewportWidth: number, viewportHeight: number): HexagonStyle {
    const size = this.randomInt(140, 300);
    const height = Math.round(size / 1.1547);
    const area = this.randomFromArray(['top', 'right', 'bottom', 'left', 'upper', 'lower'] as const);

    let leftPx = 0;
    let topPx = 0;

    if (area === 'top') {
      leftPx = this.randomFloat(-size * 0.35, viewportWidth - size * 0.65);
      topPx = this.randomFloat(-height * 0.55, viewportHeight * 0.2);
    } else if (area === 'right') {
      leftPx = this.randomFloat(viewportWidth * 0.76, viewportWidth - size * 0.15);
      topPx = this.randomFloat(-height * 0.3, viewportHeight - height * 0.7);
    } else if (area === 'bottom') {
      leftPx = this.randomFloat(-size * 0.3, viewportWidth - size * 0.6);
      topPx = this.randomFloat(viewportHeight * 0.8, viewportHeight - height * 0.15);
    } else if (area === 'left') {
      leftPx = this.randomFloat(-size * 0.5, viewportWidth * 0.18);
      topPx = this.randomFloat(-height * 0.35, viewportHeight - height * 0.68);
    } else if (area === 'upper') {
      leftPx = this.randomFloat(viewportWidth * 0.22, viewportWidth * 0.72);
      topPx = this.randomFloat(-height * 0.45, viewportHeight * 0.08);
    } else {
      leftPx = this.randomFloat(viewportWidth * 0.2, viewportWidth * 0.74);
      topPx = this.randomFloat(viewportHeight * 0.88, viewportHeight - height * 0.2);
    }

    const centerX = leftPx + size / 2;
    const centerY = topPx + height / 2;
    const radius = size * 0.44;

    return {
      id,
      leftPx,
      topPx,
      size,
      opacity: this.randomFloat(0.16, 0.3),
      rotate: this.randomFloat(-26, 26),
      tint: this.randomFromArray(this.tintPalette),
      blur: this.randomFloat(0, 0.6),
      radius,
      centerX,
      centerY,
      animDuration: this.randomFloat(15, 30) + 's',
      animDelay: this.randomFloat(0, 10) + 's'
    };
  }

  private canPlace(candidate: HexagonStyle, existing: HexagonStyle[]): boolean {
    return existing.every((hex) => {
      const dx = candidate.centerX - hex.centerX;
      const dy = candidate.centerY - hex.centerY;
      const distance = Math.hypot(dx, dy);
      const minDistance = candidate.radius + hex.radius + 18;
      return distance >= minDistance;
    });
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number): number {
    const safeMax = max < min ? min : max;
    return Number((Math.random() * (safeMax - min) + min).toFixed(2));
  }

  private randomFromArray<T>(values: readonly T[]): T {
    return values[Math.floor(Math.random() * values.length)];
  }
}
