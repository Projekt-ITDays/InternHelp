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
  selector: 'app-uczelnia',
  standalone: true,
  templateUrl: './uczelnia.html',
  styleUrl: './uczelnia.css',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule],
})
export class UczelniaComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input<string>('');
  readonly valueChange = output<string>();

  protected readonly uczelniaControl = new FormControl('', { nonNullable: true });
  protected filteredUniversityNames: string[] = [];

  private universityNames: string[] = [];
  private readonly maxSuggestionCount = 4;

  constructor() {
    effect(() => {
      const incomingValue = this.value();
      if (incomingValue !== this.uczelniaControl.value) {
        this.uczelniaControl.setValue(incomingValue, { emitEvent: false });
        this.filteredUniversityNames = this.filterUniversityNames(incomingValue);
      }
    });
  }

  ngOnInit(): void {
    this.uczelniaControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.filteredUniversityNames = this.filterUniversityNames(value);
      this.valueChange.emit(value);
    });

    this.http
      .get<UniversityEntry[]>('assets/uczelnie.json')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (universities) => {
          this.universityNames = universities.map((university) => university.name);
          this.filteredUniversityNames = this.filterUniversityNames(this.uczelniaControl.value);
        },
        error: () => {
          this.universityNames = [];
          this.filteredUniversityNames = [];
        },
      });
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
