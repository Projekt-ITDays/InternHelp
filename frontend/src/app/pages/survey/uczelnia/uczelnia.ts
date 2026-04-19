import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

type UniversityEntry = {
  id: number;
  name: string;
  city: string;
  province: string;
};

@Component({
  selector: 'app-university-picker',
  standalone: true,
  templateUrl: './uczelnia.html',
  styleUrl: './uczelnia.css',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule],
})
export class UniversityPickerComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input<string>('');
  readonly valueChange = output<string>();

  protected readonly universityControl = new FormControl('', { nonNullable: true });
  protected filteredUniversityNames: string[] = [];

  private universityNames: string[] = [];
  private readonly maxSuggestionCount = 6;
  private readonly universitiesAssetPath = 'assets/universities.json';

  constructor() {
    effect(() => {
      const incomingValue = this.value();
      if (incomingValue !== this.universityControl.value) {
        this.universityControl.setValue(incomingValue, { emitEvent: false });
        this.filteredUniversityNames = this.filterUniversityNames(incomingValue);
      }
    });
  }

  ngOnInit(): void {
    this.universityControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.filteredUniversityNames = this.filterUniversityNames(value);
      this.valueChange.emit(value);
    });

    this.loadUniversities();
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
    const uniqueNames = Array.from(
      new Set(universities.map((university) => university.name.trim()).filter((name) => name.length > 0))
    );

    this.universityNames = uniqueNames.sort((left, right) =>
      left.localeCompare(right, 'pl', { sensitivity: 'base' })
    );
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
}
