import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ChangeDetectorRef
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-hard-skills-chips',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hard-skills-chips.html',
  styleUrl: './hard-skills-chips.css',
})
export class HardSkillsChipsComponent implements OnInit {
  @Input()
  set currentSelectedSkills(value: string | null | undefined) {
    this.selectedSkills = (value || '').split(',').map(s => s.trim()).filter(s => s);
  }

  @Output() selectedSkillsChange = new EventEmitter<string>();

  readonly maxCustomSkillLength = 50;
  suggestions: any[] = [];
  selectedSkills: string[] = [];
  autocompleteSuggestions: string[] = [];
  isAutocompleteOpen = false;
  userInputControl = new FormControl('', { nonNullable: true });

  private allSkills: any[] = [];
  private closeAutocompleteTimeout: any = null;

  constructor(
    private http: HttpClient,
    private destroyRef: DestroyRef,
    private hostElement: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.hostElement.nativeElement.contains(event.target)) {
      this.isAutocompleteOpen = false;
    }
  }

  ngOnInit(): void {
    this.http.get<any[]>('assets/hard-skills.json').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (skills) => {
        this.allSkills = skills;
        this.onRefreshSuggestions();
        this.cdr.detectChanges();
      },
      error: () => {
        this.allSkills = [
          {id: 1, name: 'JavaScript', group: 'Frontend'}, {id: 2, name: 'Python', group: 'Backend'}, 
          {id: 3, name: 'SQL', group: 'Database'}, {id: 4, name: 'Docker', group: 'DevOps'}
        ];
        this.onRefreshSuggestions();
        this.cdr.detectChanges();
      }
    });

    this.userInputControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(val => {
      if (this.isAutocompleteOpen) {
        this.refreshAutocompleteSuggestions(val);
        this.cdr.detectChanges();
      }
    });
  }

  onInputFocus(): void {
    clearTimeout(this.closeAutocompleteTimeout);
    this.isAutocompleteOpen = true;
    this.refreshAutocompleteSuggestions(this.userInputControl.value);
  }

  onInputBlur(): void {
    this.closeAutocompleteTimeout = setTimeout(() => {
      this.onUserAddSkill();
      this.isAutocompleteOpen = false;
      this.cdr.detectChanges();
    }, 120);
  }

  onRefreshSuggestions(): void {
    const available = this.allSkills.filter(s => !this.selectedSkills.some(sel => sel.toLowerCase() === s.name.toLowerCase()));
    
    let lastGroup = '';
    if (this.selectedSkills.length > 0) {
      const lastSelected = this.selectedSkills[this.selectedSkills.length - 1].toLowerCase();
      const lastSkillObj = this.allSkills.find(s => s.name.toLowerCase() === lastSelected);
      if (lastSkillObj && lastSkillObj.group) {
        lastGroup = lastSkillObj.group;
      }
    }

    let groupSuggestions: any[] = [];
    let otherSuggestions: any[] = [];

    if (lastGroup) {
      const fromGroup = available.filter(s => s.group === lastGroup);
      groupSuggestions = fromGroup.sort(() => 0.5 - Math.random()).slice(0, 4);
      
      const fromOther = available.filter(s => s.group !== lastGroup);
      otherSuggestions = fromOther.sort(() => 0.5 - Math.random()).slice(0, 8 - groupSuggestions.length);
    } else {
      otherSuggestions = available.sort(() => 0.5 - Math.random()).slice(0, 8);
    }

    this.suggestions = [...groupSuggestions, ...otherSuggestions];
  }

  onSuggestionChipClick(suggestion: any): void {
    this.addSkill(suggestion.name);
  }

  onAutocompleteSuggestionClick(skillName: string): void {
    this.addSkill(skillName);
  }

  removeSelectedSkill(skillToRemove: string): void {
    this.selectedSkills = this.selectedSkills.filter(s => s !== skillToRemove);
    this.emitChange();
  }

  onCustomChipContainerClick(inputElement: HTMLInputElement): void {
    inputElement.focus();
  }

  onUserAddSkill(): void {
    const skillName = this.userInputControl.value.trim();
    if (skillName && this.addSkill(skillName)) {
      this.userInputControl.setValue('');
    }
  }

  private addSkill(skillName: string): boolean {
    if (skillName.length > this.maxCustomSkillLength) return false;
    if (this.selectedSkills.some(s => s.toLowerCase() === skillName.toLowerCase())) return false;
    
    this.selectedSkills.push(skillName);
    this.emitChange();
    this.suggestions = this.suggestions.filter(s => s.name.toLowerCase() !== skillName.toLowerCase());
    if(this.suggestions.length < 8) this.onRefreshSuggestions();
    return true;
  }

  private refreshAutocompleteSuggestions(query: string): void {
    const q = query.toLowerCase();
    let pool = this.allSkills
      .filter(s => s.name.toLowerCase().includes(q) && !this.selectedSkills.some(sel => sel.toLowerCase() === s.name.toLowerCase()))
      .map(s => s.name);
      
    pool = pool.sort(() => 0.5 - Math.random());
    this.autocompleteSuggestions = pool.slice(0, 10);
  }

  private emitChange(): void {
    this.selectedSkillsChange.emit(this.selectedSkills.join(', '));
  }
}