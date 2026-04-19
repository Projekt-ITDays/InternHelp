import {
  Component,
  DestroyRef,
  EventEmitter,
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
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './skills-chips.html',
  styleUrl: './skills-chips.css',
})
export class SkillsChipsComponent implements OnInit {
  @Input() fieldType: 'Strengths' | 'Weaknesses' = 'Strengths';

  @Input()
  set selectedSkillsFromOtherField(value: string | null | undefined) {
    this._selectedSkillsFromOtherField = this.normalizeInputValue(value);
    this.synchronizeIfReady();
  }

  get selectedSkillsFromOtherField(): string {
    return this._selectedSkillsFromOtherField;
  }

  @Input()
  set currentSelectedSkills(value: string | null | undefined) {
    this._currentSelectedSkills = this.normalizeInputValue(value);
    this.selectedSkills = this.parseSkills(this._currentSelectedSkills);
    this.synchronizeIfReady();
  }

  get currentSelectedSkills(): string {
    return this._currentSelectedSkills;
  }

  @Output() selectedSkillsChange = new EventEmitter<string>();

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

  private allSkills: Skill[] = [];
  private groupedSkills: GroupedSkills = {};
  private _selectedSkillsFromOtherField = '';
  private _currentSelectedSkills = '';
  private recentlyShownSkillIds: number[] = [];
  private readonly targetSuggestionsCount = 4;
  private readonly recentWindowSize = 18;
  private readonly autocompleteLimit = 10;
  private readonly primarySkillsAssetPath = 'assets/soft-skills.json';
  private readonly fallbackSkillsAssetPath = 'assets/umiejetnosci_miekkie.json';
  private closeAutocompleteTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly destroyRef: DestroyRef;

  constructor(private http: HttpClient, destroyRef: DestroyRef) {
    this.destroyRef = destroyRef;
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

  get canSubmitCustomSkill(): boolean {
    const currentLength = this.userInputControl.value.trim().length;
    return (
      currentLength >= this.minCustomSkillLength &&
      currentLength <= this.maxCustomSkillLength
    );
  }

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
        next: (legacySkills) => this.handleSkillsLoaded(this.mapLegacySkills(legacySkills)),
        error: (err) => {
          console.error('Failed to load skills:', err);
          this.showEmergencySuggestions();
        },
      });
  }

  private handleSkillsLoaded(skills: Skill[]): void {
    this.allSkills = skills;
    this.initializeSuggestions();
  }

  private mapLegacySkills(legacySkills: LegacySkill[]): Skill[] {
    return legacySkills.map((skill) => ({
      id: skill.nr,
      name: skill.umiejetnosc,
      group: skill.grupa,
      general_popularity: skill.popularnosc_ogolna,
      popularity_in_group: skill.popularnosc_w_grupie,
      group_popularity: skill.popularnosc_grupy,
    }));
  }

  private initializeSuggestions(): void {
    if (this.allSkills.length === 0) {
      this.showEmergencySuggestions();
      return;
    }

    this.groupSkills();
    this.synchronizeSuggestions(true);
  }

  private showEmergencySuggestions(): void {
    this.suggestions = this.emergencySuggestionNames.map((name, index) => ({
      id: 100000 + index,
      name,
      group: `Emergency-${index + 1}`,
      general_popularity: 100 - index,
      popularity_in_group: 100 - index,
      group_popularity: 100 - index,
    }));
  }

  private groupSkills(): void {
    this.groupedSkills = {};
    for (const skill of this.allSkills) {
      if (!this.groupedSkills[skill.group]) {
        this.groupedSkills[skill.group] = [];
      }
      this.groupedSkills[skill.group].push(skill);
    }
  }

  private parseSkills(raw: string): string[] {
    if (typeof raw !== 'string' || raw.length === 0) {
      return [];
    }

    const parsed = raw
      .split(',')
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);

    const seen = new Set<string>();
    return parsed.filter((skill) => {
      const normalized = skill.toLowerCase();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  }

  private normalizeInputValue(value: string | null | undefined): string {
    return typeof value === 'string' ? value : '';
  }

  private synchronizeIfReady(): void {
    if (this.allSkills.length > 0) {
      this.synchronizeSuggestions(false);
    }
  }

  private getOtherFieldSelectedSkills(): string[] {
    return this.parseSkills(this.selectedSkillsFromOtherField);
  }

  private toLowerSet(values: string[]): Set<string> {
    return new Set(values.map((value) => value.toLowerCase()));
  }

  private calculateSuggestionsCount(): number {
    return this.targetSuggestionsCount;
  }

  private resolveBlockedGroups(selectedSkillNames: Set<string>): Set<string> {
    const blockedGroups = new Set<string>();

    for (const skill of this.allSkills) {
      if (selectedSkillNames.has(skill.name.toLowerCase())) {
        blockedGroups.add(skill.group);
      }
    }

    return blockedGroups;
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

  private synchronizeSuggestions(resetExisting: boolean): void {
    if (resetExisting) {
      this.suggestions = [];
    }

    const selectedInCurrentField = [...this.selectedSkills];
    const selectedInOtherField = this.getOtherFieldSelectedSkills();
    const targetCount = this.calculateSuggestionsCount();
    const selectedInCurrentLower = this.toLowerSet(selectedInCurrentField);

    const excludedSkillNames = new Set<string>([
      ...selectedInCurrentLower,
      ...this.toLowerSet(selectedInOtherField),
    ]);
    const blockedGroups = this.resolveBlockedGroups(selectedInCurrentLower);
    const knownSkillNames =
      this.allSkills.length > 0
        ? this.toLowerSet(this.allSkills.map((skill) => skill.name))
        : null;
    const usedGroups = new Set<string>();
    const keptSuggestions: Skill[] = [];

    for (const suggestion of this.suggestions) {
      if (
        this.tryKeepSuggestion(
          suggestion,
          excludedSkillNames,
          blockedGroups,
          usedGroups,
          knownSkillNames
        )
      ) {
        keptSuggestions.push(suggestion);
      }
    }

    this.suggestions = keptSuggestions;
    this.fillSuggestionsToTarget(targetCount, excludedSkillNames, blockedGroups, usedGroups);

    if (this.isAutocompleteOpen) {
      this.refreshAutocompleteSuggestions();
    }
  }

  private tryKeepSuggestion(
    suggestion: Skill,
    excludedSkillNames: Set<string>,
    blockedGroups: Set<string>,
    usedGroups: Set<string>,
    knownSkillNames: Set<string> | null
  ): boolean {
    const suggestionNameLower = suggestion.name.toLowerCase();

    if (knownSkillNames && !knownSkillNames.has(suggestionNameLower)) {
      return false;
    }
    if (excludedSkillNames.has(suggestionNameLower)) {
      return false;
    }
    if (blockedGroups.has(suggestion.group)) {
      return false;
    }
    if (usedGroups.has(suggestion.group)) {
      return false;
    }

    usedGroups.add(suggestion.group);
    excludedSkillNames.add(suggestionNameLower);
    return true;
  }

  private fillSuggestionsToTarget(
    targetCount: number,
    excludedSkillNames: Set<string>,
    blockedGroups: Set<string>,
    usedGroups: Set<string>
  ): void {
    let guard = 0;
    while (this.suggestions.length < targetCount && guard < 100) {
      guard += 1;

      const group = this.selectWeightedGroup(usedGroups, blockedGroups);
      if (!group) {
        break;
      }

      const suggestedSkill =
        this.selectWeightedSkillFromGroup(group, excludedSkillNames, true) ??
        this.selectWeightedSkillFromGroup(group, excludedSkillNames, false);

      if (!suggestedSkill) {
        blockedGroups.add(group);
        continue;
      }

      this.suggestions.push(suggestedSkill);
      usedGroups.add(group);
      excludedSkillNames.add(suggestedSkill.name.toLowerCase());
      this.pushRecentlyShown(suggestedSkill.id);
    }

    if (this.suggestions.length >= targetCount) {
      return;
    }

    const fallbackPool = this.allSkills
      .filter((skill) => !excludedSkillNames.has(skill.name.toLowerCase()))
      .filter((skill) => !blockedGroups.has(skill.group))
      .filter((skill) => !usedGroups.has(skill.group))
      .sort((a, b) => b.general_popularity - a.general_popularity);

    for (const skill of fallbackPool) {
      this.suggestions.push(skill);
      usedGroups.add(skill.group);
      excludedSkillNames.add(skill.name.toLowerCase());
      this.pushRecentlyShown(skill.id);

      if (this.suggestions.length >= targetCount) {
        break;
      }
    }
  }

  private selectWeightedGroup(
    usedGroups: Set<string>,
    blockedGroups: Set<string>
  ): string | null {
    const availableGroups = Object.keys(this.groupedSkills).filter(
      (group) => !usedGroups.has(group) && !blockedGroups.has(group)
    );

    if (availableGroups.length === 0) {
      return null;
    }

    const weightedGroups = availableGroups.map((group) => ({
      name: group,
      weight: this.groupedSkills[group][0]?.group_popularity || 0,
    }));
    const totalWeight = weightedGroups.reduce((sum, g) => sum + g.weight, 0);

    if (totalWeight === 0) {
      return availableGroups[Math.floor(Math.random() * availableGroups.length)];
    }

    let random = Math.random() * totalWeight;
    for (const group of weightedGroups) {
      random -= group.weight;
      if (random <= 0) {
        return group.name;
      }
    }

    return availableGroups[availableGroups.length - 1];
  }

  private selectWeightedSkillFromGroup(
    group: string,
    excludedSkillNames: Set<string>,
    avoidRecentlyShown: boolean
  ): Skill | null {
    const skillsFromGroup = this.groupedSkills[group] ?? [];
    const availableSkills = skillsFromGroup.filter((skill) => {
      const normalizedName = skill.name.toLowerCase();
      const isExcluded = excludedSkillNames.has(normalizedName);
      const isRecent = avoidRecentlyShown && this.isRecentlyShown(skill.id);
      return !isExcluded && !isRecent;
    });

    if (availableSkills.length === 0) {
      return null;
    }

    const totalWeight = availableSkills.reduce(
      (sum, skill) => sum + skill.popularity_in_group,
      0
    );

    if (totalWeight === 0) {
      return availableSkills[Math.floor(Math.random() * availableSkills.length)];
    }

    let random = Math.random() * totalWeight;
    for (const skill of availableSkills) {
      random -= skill.popularity_in_group;
      if (random <= 0) {
        return skill;
      }
    }

    return availableSkills[availableSkills.length - 1];
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
      this.isAutocompleteOpen = false;
      this.closeAutocompleteTimeout = null;
    }, 120);
  }

  onAutocompleteSuggestionClick(skillName: string): void {
    if (this.closeAutocompleteTimeout) {
      clearTimeout(this.closeAutocompleteTimeout);
      this.closeAutocompleteTimeout = null;
    }

    const hasAdded = this.addSkill(skillName);
    if (!hasAdded) {
      return;
    }

    this.finalizeAddedSkill();
  }

  private refreshAutocompleteSuggestions(): void {
    const currentQuery = this.userInputControl.value.trim().toLowerCase();
    const excludedNames = this.buildAutocompleteExcludedNames();

    const pool = this.getAutocompletePool()
      .filter((name) => !excludedNames.has(name.toLowerCase()))
      .filter((name) =>
        !currentQuery ? true : name.toLowerCase().includes(currentQuery)
      );

    const shuffled = this.shuffleStrings(pool);
    this.autocompleteSuggestions = shuffled.slice(0, this.autocompleteLimit);
  }

  private buildAutocompleteExcludedNames(): Set<string> {
    return new Set<string>([
      ...this.selectedSkills.map((skill) => skill.toLowerCase()),
      ...this.suggestions.map((skill) => skill.name.toLowerCase()),
      ...this.getOtherFieldSelectedSkills().map((skill) => skill.toLowerCase()),
    ]);
  }

  private getAutocompletePool(): string[] {
    if (this.allSkills.length > 0) {
      const uniqueNames = new Set(this.allSkills.map((skill) => skill.name));
      return [...uniqueNames];
    }

    return [...this.emergencySuggestionNames];
  }

  private shuffleStrings(items: string[]): string[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      const temp = result[i];
      result[i] = result[randomIndex];
      result[randomIndex] = temp;
    }
    return result;
  }

  onSuggestionChipClick(suggestion: Skill): void {
    const hasAdded = this.addSkill(suggestion.name);
    if (!hasAdded) {
      return;
    }

    this.suggestions = this.suggestions.filter((skill) => skill.id !== suggestion.id);
    this.synchronizeSuggestions(false);
  }

  removeSelectedSkill(skillToRemove: string): void {
    const initialLength = this.selectedSkills.length;
    this.selectedSkills = this.selectedSkills.filter(
      (skill) => skill !== skillToRemove
    );

    if (this.selectedSkills.length === initialLength) {
      return;
    }

    this.selectedSkillsChange.emit(this.selectedSkills.join(', '));
    this.synchronizeSuggestions(false);
  }

  onCustomChipContainerClick(inputElement: HTMLInputElement): void {
    inputElement.focus();
    this.onInputFocus();
  }

  onUserAddSkill(): void {
    if (!this.canSubmitCustomSkill) {
      return;
    }

    const normalizedValue = this.userInputControl.value.trim();
    const hasAdded = this.addSkill(normalizedValue);
    if (!hasAdded) {
      return;
    }

    this.finalizeAddedSkill();
  }

  private finalizeAddedSkill(): void {
    this.userInputControl.setValue('');
    this.synchronizeSuggestions(false);
    this.refreshAutocompleteSuggestions();
  }

  onRefreshSuggestions(): void {
    if (this.allSkills.length === 0) {
      this.showEmergencySuggestions();
      this.refreshAutocompleteSuggestions();
      return;
    }

    this.recentlyShownSkillIds = [];
    this.synchronizeSuggestions(true);
    this.refreshAutocompleteSuggestions();
  }

  private addSkill(rawSkillName: string): boolean {
    const skillName = rawSkillName.trim();
    if (!skillName) {
      return false;
    }

    if (skillName.length > this.maxCustomSkillLength) {
      return false;
    }

    const normalized = skillName.toLowerCase();
    const selectedLower = this.toLowerSet(this.selectedSkills);
    if (selectedLower.has(normalized)) {
      return false;
    }

    const otherSkillsLower = this.toLowerSet(this.getOtherFieldSelectedSkills());
    if (otherSkillsLower.has(normalized)) {
      return false;
    }

    this.selectedSkills = [...this.selectedSkills, skillName];
    this.selectedSkillsChange.emit(this.selectedSkills.join(', '));
    return true;
  }
}
