import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface Skill {
  id: number;
  name: string;
  group: string;
  general_popularity: number;
  popularity_in_group: number;
  group_popularity: number;
}

interface LegacySkill {
  nr: number;
  umiejetnosc: string;
  grupa: string;
  popularnosc_ogolna: number;
  popularnosc_w_grupie: number;
  popularnosc_grupy: number;
}

interface GroupedSkills {
  [groupName: string]: Skill[];
}

@Component({
  selector: 'app-skills-chips',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './skills-chips.html',
  styleUrl: './skills-chips.css',
})
export class SkillsChipsComponent implements OnInit {
  @Input() fieldType: 'Strengths' | 'Weaknesses' = 'Strengths';

  @Input()
  set currentSelectedSkills(value: string | null | undefined) {
    this._currentSelectedSkills = value ?? '';
    const incoming = this.parseSkills(this._currentSelectedSkills);

    if (this.areSkillListsEqual(incoming, this.selectedSkills)) {
      return;
    }

    this.selectedSkills = incoming;
    this.synchronizeIfReady();
  }

  get currentSelectedSkills(): string {
    return this._currentSelectedSkills;
  }

  @Output() selectedSkillsChange = new EventEmitter<string>();

  readonly placeholderText = 'Własna umiejętność';
  readonly maxCustomSkillLength = 40;
  readonly minCustomSkillLength = 5;
  readonly emergencySuggestionNames = [
    'Komunikacja',
    'Praca zespołowa',
    'Rozwiązywanie problemów',
    'Adaptacyjność',
  ];

  suggestions: Skill[] = [];
  selectedSkills: string[] = [];
  autocompleteSuggestions: string[] = [];
  isAutocompleteOpen = false;
  userInputControl = new FormControl('', { nonNullable: true });

  get canSubmitCustomSkill(): boolean {
    const len = this.userInputControl.value.trim().length;
    return len >= this.minCustomSkillLength && len <= this.maxCustomSkillLength;
  }

  private allSkills: Skill[] = [];
  private groupedSkills: GroupedSkills = {};
  private _currentSelectedSkills = '';
  private recentlyShownSkillIds: number[] = [];

  private readonly targetSuggestionsCount = 4;
  private readonly recentWindowSize = 18;
  private readonly autocompleteLimit = 10;
  private readonly primarySkillsAssetPath = 'assets/soft-skills.json';
  private readonly fallbackSkillsAssetPath = 'assets/umiejetnosci_miekkie.json';

  private closeAutocompleteTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly destroyRef: DestroyRef;
  private readonly hostElement: ElementRef<HTMLElement>;

  constructor(
    private http: HttpClient,
    destroyRef: DestroyRef,
    hostElement: ElementRef<HTMLElement>,
  ) {
    this.destroyRef = destroyRef;
    this.hostElement = hostElement;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && this.hostElement.nativeElement.contains(target)) {
      return;
    }
    this.closeAutocomplete();
  }

  ngOnInit(): void {
    this.selectedSkills = this.parseSkills(this.currentSelectedSkills);
    this.showEmergencySuggestions();
    this.loadSkills();

    this.userInputControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.isAutocompleteOpen) {
          this.refreshAutocompleteSuggestions();
        }
      });
  }

  onInputFocus(): void {
    if (this.closeAutocompleteTimeout) {
      clearTimeout(this.closeAutocompleteTimeout);
      this.closeAutocompleteTimeout = null;
    }
    this.isAutocompleteOpen = true;
    this.refreshAutocompleteSuggestions();
  }

  onInputBlur(): void {
    this.closeAutocompleteTimeout = setTimeout(() => {
      if (this.canSubmitCustomSkill) {
        this.onUserAddSkill();
      }
      this.isAutocompleteOpen = false;
      this.closeAutocompleteTimeout = null;
    }, 120);
  }

  onCustomChipContainerClick(inputElement: HTMLInputElement): void {
    inputElement.focus();
    this.onInputFocus();
  }

  onUserAddSkill(): void {
    if (!this.canSubmitCustomSkill) {
      return;
    }
    const skillName = this.userInputControl.value.trim();
    if (this.addSkill(skillName)) {
      this.finalizeAddedSkill(skillName);
    }
  }

  onSuggestionChipClick(suggestion: Skill): void {
    if (this.addSkill(suggestion.name)) {
      this.finalizeAddedSkill(suggestion.name);
    }
  }

  onAutocompleteSuggestionClick(skillName: string): void {
    if (this.closeAutocompleteTimeout) {
      clearTimeout(this.closeAutocompleteTimeout);
      this.closeAutocompleteTimeout = null;
    }
    if (this.addSkill(skillName)) {
      this.finalizeAddedSkill(skillName);
    }
  }

  removeSelectedSkill(skillToRemove: string): void {
    const before = this.selectedSkills.length;
    this.selectedSkills = this.selectedSkills.filter((s) => s !== skillToRemove);

    if (this.selectedSkills.length === before) {
      return;
    }

    this.selectedSkillsChange.emit(this.selectedSkills.join(', '));
    this.keepSuggestionsStableAfterRemove();
    this.refreshAutocompleteSuggestions();
  }

  onRefreshSuggestions(): void {
    if (this.allSkills.length === 0) {
      this.showEmergencySuggestions();
    } else {
      this.recentlyShownSkillIds = [];
      this.synchronizeSuggestions(true);
    }
    this.refreshAutocompleteSuggestions();
  }

  // ─── Private: data loading ────────────────────────────────────────────────

  private loadSkills(): void {
    this.http
      .get<Skill[]>(this.primarySkillsAssetPath)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (skills) => this.handleSkillsLoaded(skills),
        error: () => this.loadLegacySkills(),
      });
  }

  private loadLegacySkills(): void {
    this.http
      .get<LegacySkill[]>(this.fallbackSkillsAssetPath)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (legacy) => this.handleSkillsLoaded(this.mapLegacySkills(legacy)),
        error: (err) => {
          console.error('Failed to load skills:', err);
          this.showEmergencySuggestions();
        },
      });
  }

  private handleSkillsLoaded(skills: Skill[]): void {
    this.allSkills = skills;
    this.groupSkills();
    this.synchronizeSuggestions(true);
  }

  private mapLegacySkills(legacy: LegacySkill[]): Skill[] {
    return legacy.map((s) => ({
      id: s.nr,
      name: s.umiejetnosc,
      group: s.grupa,
      general_popularity: s.popularnosc_ogolna,
      popularity_in_group: s.popularnosc_w_grupie,
      group_popularity: s.popularnosc_grupy,
    }));
  }

  // ─── Private: suggestions ─────────────────────────────────────────────────

  private showEmergencySuggestions(): void {
    this.suggestions = this.emergencySuggestionNames.map((name, i) => ({
      id: 100_000 + i,
      name,
      group: `Emergency-${i + 1}`,
      general_popularity: 100 - i,
      popularity_in_group: 100 - i,
      group_popularity: 100 - i,
    }));
  }

  private groupSkills(): void {
    this.groupedSkills = {};
    for (const skill of this.allSkills) {
      (this.groupedSkills[skill.group] ??= []).push(skill);
    }
  }

  private synchronizeIfReady(): void {
    if (this.allSkills.length > 0) {
      this.synchronizeSuggestions(false);
    }
  }

  private synchronizeSuggestions(resetExisting: boolean): void {
    if (resetExisting) {
      this.suggestions = [];
    }

    const selectedLower = this.toLowerSet(this.selectedSkills);
    const excludedNames = new Set<string>(selectedLower);
    const blockedGroups = this.resolveBlockedGroups(selectedLower);
    const knownNames = this.allSkills.length > 0
      ? this.toLowerSet(this.allSkills.map((s) => s.name))
      : null;
    const usedGroups = new Set<string>();

    this.suggestions = this.suggestions.filter((suggestion) =>
      this.tryKeepSuggestion(suggestion, excludedNames, blockedGroups, usedGroups, knownNames),
    );

    this.fillSuggestionsToTarget(excludedNames, blockedGroups, usedGroups);

    if (this.isAutocompleteOpen) {
      this.refreshAutocompleteSuggestions();
    }
  }

  private tryKeepSuggestion(
    suggestion: Skill,
    excludedNames: Set<string>,
    blockedGroups: Set<string>,
    usedGroups: Set<string>,
    knownNames: Set<string> | null,
  ): boolean {
    const nameLower = suggestion.name.toLowerCase();

    if (knownNames && !knownNames.has(nameLower)) return false;
    if (excludedNames.has(nameLower)) return false;
    if (blockedGroups.has(suggestion.group)) return false;
    if (usedGroups.has(suggestion.group)) return false;

    usedGroups.add(suggestion.group);
    excludedNames.add(nameLower);
    return true;
  }

  private fillSuggestionsToTarget(
    excludedNames: Set<string>,
    blockedGroups: Set<string>,
    usedGroups: Set<string>,
  ): void {
    let guard = 0;
    while (this.suggestions.length < this.targetSuggestionsCount && guard < 100) {
      guard += 1;

      const group = this.selectWeightedGroup(usedGroups, blockedGroups);
      if (!group) break;

      const skill =
        this.selectWeightedSkillFromGroup(group, excludedNames, true) ??
        this.selectWeightedSkillFromGroup(group, excludedNames, false);

      if (!skill) {
        blockedGroups.add(group);
        continue;
      }

      this.suggestions.push(skill);
      usedGroups.add(group);
      excludedNames.add(skill.name.toLowerCase());
      this.pushRecentlyShown(skill.id);
    }

    if (this.suggestions.length >= this.targetSuggestionsCount) return;

    // Deterministic fallback: fill remaining slots by popularity
    const fallback = this.allSkills
      .filter((s) => !excludedNames.has(s.name.toLowerCase()))
      .filter((s) => !blockedGroups.has(s.group))
      .filter((s) => !usedGroups.has(s.group))
      .sort((a, b) => b.general_popularity - a.general_popularity);

    for (const skill of fallback) {
      if (this.suggestions.length >= this.targetSuggestionsCount) break;
      this.suggestions.push(skill);
      usedGroups.add(skill.group);
      excludedNames.add(skill.name.toLowerCase());
      this.pushRecentlyShown(skill.id);
    }
  }

  private keepSuggestionsStableAfterAdd(addedName: string): void {
    this.suggestions = this.suggestions.filter(
      (s) => s.name.toLowerCase() !== addedName.toLowerCase(),
    );
    this.fillSuggestionsDeterministically();
  }

  private keepSuggestionsStableAfterRemove(): void {
    this.fillSuggestionsDeterministically();
  }

  private fillSuggestionsDeterministically(): void {
    if (this.allSkills.length === 0 || this.suggestions.length >= this.targetSuggestionsCount) {
      return;
    }

    const selectedLower = this.toLowerSet(this.selectedSkills);
    const blockedGroups = this.resolveBlockedGroups(selectedLower);
    const usedGroups = new Set(this.suggestions.map((s) => s.group));
    const excludedNames = new Set<string>([
      ...selectedLower,
      ...this.suggestions.map((s) => s.name.toLowerCase()),
    ]);

    const replacements = this.allSkills
      .filter((s) => !excludedNames.has(s.name.toLowerCase()))
      .filter((s) => !blockedGroups.has(s.group))
      .filter((s) => !usedGroups.has(s.group))
      .sort((a, b) =>
        b.general_popularity !== a.general_popularity
          ? b.general_popularity - a.general_popularity
          : b.popularity_in_group - a.popularity_in_group,
      );

    for (const skill of replacements) {
      if (this.suggestions.length >= this.targetSuggestionsCount) break;
      this.suggestions = [...this.suggestions, skill];
      usedGroups.add(skill.group);
      excludedNames.add(skill.name.toLowerCase());
    }
  }

  // ─── Private: autocomplete ────────────────────────────────────────────────

  private closeAutocomplete(): void {
    this.isAutocompleteOpen = false;
  }

  private refreshAutocompleteSuggestions(): void {
    const query = this.userInputControl.value.trim().toLowerCase();
    const excluded = new Set<string>([
      ...this.selectedSkills.map((s) => s.toLowerCase()),
      ...this.suggestions.map((s) => s.name.toLowerCase()),
    ]);

    const pool = this.getAutocompletePool()
      .filter((name) => !excluded.has(name.toLowerCase()))
      .filter((name) => !query || name.toLowerCase().includes(query));

    this.autocompleteSuggestions = this.shuffleStrings(pool).slice(0, this.autocompleteLimit);
  }

  private getAutocompletePool(): string[] {
    if (this.allSkills.length > 0) {
      return [...new Set(this.allSkills.map((s) => s.name))];
    }
    return [...this.emergencySuggestionNames];
  }

  // ─── Private: skill management ────────────────────────────────────────────

  private addSkill(rawName: string): boolean {
    const name = rawName.trim();
    if (!name || name.length > this.maxCustomSkillLength) return false;

    const selectedLower = this.toLowerSet(this.selectedSkills);
    if (selectedLower.has(name.toLowerCase())) return false;

    this.selectedSkills = [...this.selectedSkills, name];
    this.selectedSkillsChange.emit(this.selectedSkills.join(', '));
    return true;
  }

  private finalizeAddedSkill(addedName: string): void {
    this.userInputControl.setValue('');
    this.keepSuggestionsStableAfterAdd(addedName);
    this.refreshAutocompleteSuggestions();
  }

  // ─── Private: utilities ───────────────────────────────────────────────────

  private parseSkills(raw: string): string[] {
    if (!raw) return [];

    const seen = new Set<string>();
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .filter((s) => {
        const lower = s.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });
  }

  private areSkillListsEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v.toLowerCase() === b[i].toLowerCase());
  }

  private toLowerSet(values: string[]): Set<string> {
    return new Set(values.map((v) => v.toLowerCase()));
  }

  private resolveBlockedGroups(selectedLower: Set<string>): Set<string> {
    return new Set(
      this.allSkills
        .filter((s) => selectedLower.has(s.name.toLowerCase()))
        .map((s) => s.group),
    );
  }

  private isRecentlyShown(skillId: number): boolean {
    return this.recentlyShownSkillIds.includes(skillId);
  }

  private pushRecentlyShown(skillId: number): void {
    this.recentlyShownSkillIds.push(skillId);
    if (this.recentlyShownSkillIds.length > this.recentWindowSize) {
      this.recentlyShownSkillIds.shift();
    }
  }

  private selectWeightedGroup(
    usedGroups: Set<string>,
    blockedGroups: Set<string>,
  ): string | null {
    const available = Object.keys(this.groupedSkills).filter(
      (g) => !usedGroups.has(g) && !blockedGroups.has(g),
    );
    if (available.length === 0) return null;

    const weighted = available.map((g) => ({
      name: g,
      weight: this.groupedSkills[g][0]?.group_popularity ?? 0,
    }));
    const total = weighted.reduce((sum, g) => sum + g.weight, 0);

    if (total === 0) return available[Math.floor(Math.random() * available.length)];

    let rng = Math.random() * total;
    for (const group of weighted) {
      rng -= group.weight;
      if (rng <= 0) return group.name;
    }
    return available[available.length - 1];
  }

  private selectWeightedSkillFromGroup(
    group: string,
    excludedNames: Set<string>,
    avoidRecent: boolean,
  ): Skill | null {
    const candidates = (this.groupedSkills[group] ?? []).filter((s) => {
      const lower = s.name.toLowerCase();
      return !excludedNames.has(lower) && !(avoidRecent && this.isRecentlyShown(s.id));
    });

    if (candidates.length === 0) return null;

    const total = candidates.reduce((sum, s) => sum + s.popularity_in_group, 0);
    if (total === 0) return candidates[Math.floor(Math.random() * candidates.length)];

    let rng = Math.random() * total;
    for (const skill of candidates) {
      rng -= skill.popularity_in_group;
      if (rng <= 0) return skill;
    }
    return candidates[candidates.length - 1];
  }

  private shuffleStrings(items: string[]): string[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
