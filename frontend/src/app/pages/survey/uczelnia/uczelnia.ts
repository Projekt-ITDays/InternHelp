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
  ChangeDetectorRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

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
  private readonly hostElement = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly value = input<string>('');
  readonly valueChange = output<string>();

  protected readonly universityControl = new FormControl('', { nonNullable: true });
  protected filteredUniversityNames: string[] = [];
  protected isDropdownOpen = false;

  private universityNames: string[] = [];
  private closeDropdownTimeout: any = null;

  constructor() {
    effect(() => {
      if (this.value() !== this.universityControl.value) {
        this.universityControl.setValue(this.value(), { emitEvent: false });
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.hostElement.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  ngOnInit(): void {
    this.universityControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(val => {
      this.filteredUniversityNames = this.filterUniversityNames(val);
      this.valueChange.emit(val);
      this.cdr.detectChanges();
    });

    this.http.get<any[]>('assets/universities.json').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (universities) => {
        this.universityNames = Array.from(new Set(universities.map(u => u.name.trim()))).filter(Boolean);
        this.cdr.detectChanges();
      }
    });
  }

  onInputFocus(): void {
    clearTimeout(this.closeDropdownTimeout);
    this.isDropdownOpen = true;
    this.filteredUniversityNames = this.filterUniversityNames(this.universityControl.value);
  }

  onInputBlur(): void {
    this.closeDropdownTimeout = setTimeout(() => {
      this.isDropdownOpen = false;
      this.cdr.detectChanges();
    }, 120);
  }

  onOptionClick(name: string): void {
    this.universityControl.setValue(name);
    this.isDropdownOpen = false;
  }

  private filterUniversityNames(query: string): string[] {
    const q = query.toLowerCase();
    return this.universityNames.filter(name => name.toLowerCase().includes(q)).slice(0, 10);
  }
}
