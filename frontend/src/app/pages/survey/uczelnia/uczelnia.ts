import { HttpClient } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

type UniversityEntry = {
  id: number;
  name: string;
  city: string;
  province: string;
  popularity_score?: number;
};

@Component({
  selector: 'app-university-picker',
  standalone: true,
  templateUrl: './uczelnia.html',
  styleUrl: './uczelnia.css',
  imports: [ReactiveFormsModule],
})
export class UniversityPickerComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly value = input<string>('');
  readonly valueChange = output<string>();

  protected readonly universityControl = new FormControl('', { nonNullable: true });
  protected filteredUniversityNames: string[] = [];
  protected isDropdownOpen = false;

  private universityNames: string[] = [];
  private readonly maxSuggestionCount = 10;
  private readonly universitiesAssetPath = 'assets/universities.json';
  private closeDropdownTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const incomingValue = this.value();
      if (incomingValue !== this.universityControl.value) {
        this.universityControl.setValue(incomingValue, { emitEvent: false });
        this.filteredUniversityNames = this.filterUniversityNames(incomingValue);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && this.hostElement.nativeElement.contains(target)) {
      return;
    }

    this.closeDropdown();
  }

  ngOnInit(): void {
    this.universityControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.filteredUniversityNames = this.filterUniversityNames(value);
      this.valueChange.emit(value);
    });

    this.loadUniversities();
  }

  onInputFocus(): void {
    this.clearCloseDropdownTimeout();
    this.isDropdownOpen = true;
    this.filteredUniversityNames = this.filterUniversityNames(this.universityControl.value);
  }

  onInputBlur(): void {
    this.closeDropdownTimeout = setTimeout(() => {
      this.isDropdownOpen = false;
      this.closeDropdownTimeout = null;
    }, 120);
  }

  onOptionClick(name: string): void {
    this.clearCloseDropdownTimeout();
    this.universityControl.setValue(name);
    this.isDropdownOpen = false;
  }

  private loadUniversities(): void {
    this.http
      .get<UniversityEntry[]>(this.universitiesAssetPath)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (universities) => this.handleUniversitiesLoaded(universities),
        error: () => {
          this.universityNames = [];
          this.filteredUniversityNames = [];
        },
      });
  }

  private handleUniversitiesLoaded(universities: UniversityEntry[]): void {
    const uniqueByName = new Map<string, { name: string; popularity: number }>();

    for (const university of universities) {
      const trimmedName = university.name.trim();
      if (trimmedName.length === 0) {
        continue;
      }

      const normalizedName = trimmedName.toLowerCase();
      const rawPopularity = Number(university.popularity_score);
      const popularity = Number.isFinite(rawPopularity) ? rawPopularity : 0;
      const existing = uniqueByName.get(normalizedName);

      if (!existing || popularity > existing.popularity) {
        uniqueByName.set(normalizedName, { name: trimmedName, popularity });
      }
    }

    this.universityNames = [...uniqueByName.values()]
      .sort((left, right) => {
        if (right.popularity !== left.popularity) {
          return right.popularity - left.popularity;
        }

        return left.name.localeCompare(right.name, 'pl', { sensitivity: 'base' });
      })
      .map((item) => item.name);

    this.filteredUniversityNames = this.filterUniversityNames(this.universityControl.value);
  }

  private filterUniversityNames(query: string): string[] {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return this.universityNames.slice(0, this.maxSuggestionCount);
    }

    return this.universityNames
      .filter((name) => name.toLowerCase().includes(normalizedQuery))
      .slice(0, this.maxSuggestionCount);
  }

  private closeDropdown(): void {
    this.clearCloseDropdownTimeout();
    this.isDropdownOpen = false;
  }

  private clearCloseDropdownTimeout(): void {
    if (!this.closeDropdownTimeout) {
      return;
    }

    clearTimeout(this.closeDropdownTimeout);
    this.closeDropdownTimeout = null;
  }
}
