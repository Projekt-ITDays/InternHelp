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

interface GroupedSkills {
  [groupName: string]: Skill[];
}

@Component({
  selector: 'app-hard-skills-chips',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './hard-skills-chips.html',
  styleUrl: './hard-skills-chips.css',
})
export class HardSkillsChipsComponent implements OnInit {
  @Input()
  set currentSelectedSkills(value: string | null | undefined) {
    this._currentSelectedSkills = this.normalizeInputValue(value);
    const parsedIncoming = this.parseSkills(this._currentSelectedSkills);
    const hasSelectionChanged = !this.areSkillListsEqual(parsedIncoming, this.selectedSkills);
    this.selectedSkills = parsedIncoming;

    if (!hasSelectionChanged) {
      return;
    }

    this.synchronizeIfReady();
  }

  get currentSelectedSkills(): string {
    return this._currentSelectedSkills;
  }

  @Output() selectedSkillsChange = new EventEmitter<string>();

  readonly maxCustomSkillLength = 50;
  readonly minCustomSkillLength = 1;
  readonly emergencySuggestionNames = [
    'JavaScript',
    'Python',
    'SQL',
    'Docker',
    'Git',
    'Linux',
  ];

  suggestions: Skill[] = [];
  selectedSkills: string[] = [];
  autocompleteSuggestions: string[] = [];
  isAutocompleteOpen = false;
  userInputControl = new FormControl('', { nonNullable: true });

  private allSkills: Skill[] = [];
  private groupedSkills: GroupedSkills = {};
  private _currentSelectedSkills = '';
  private recentlyShownSkillIds: number[] = [];
  private readonly recentWindowSize = 36;
  private readonly targetSuggestionsCount = 8;
  private readonly selectedGroupsSuggestionsCount = 4;
  private readonly lastGroupPriorityCount = 2;
  private readonly autocompleteLimit = 14;
  private readonly skillsAssetPath = 'assets/hard-skills.json';
  private closeAutocompleteTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly destroyRef: DestroyRef;
  private readonly hostElement: ElementRef<HTMLElement>;

  constructor(
    private http: HttpClient,
    destroyRef: DestroyRef,
    hostElement: ElementRef<HTMLElement>
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

  get canSubmitCustomSkill(): boolean {
    const currentLength = this.userInputControl.value.trim().length;
    return (
      currentLength >= this.minCustomSkillLength &&
      currentLength <= this.maxCustomSkillLength
    );
  }

  private normalizeInputValue(value: string | null | undefined): string {
    return typeof value === 'string' ? value : '';
  }

  private synchronizeIfReady(): void {
    if (this.allSkills.length > 0) {
      this.synchronizeSuggestions();
    }
  }

  private loadSkills(): void {
    this.http
      .get<Skill[]>(this.skillsAssetPath)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (skills) => this.handleSkillsLoaded(skills),
        error: (err) => {
          console.error('Failed to load hard skills:', err);
          this.showEmergencySuggestions();
        },
      });
  }

  private handleSkillsLoaded(skills: Skill[]): void {
    this.allSkills = this.deduplicateSkills(skills);
    this.groupSkills();
    this.synchronizeSuggestions();
  }

  private deduplicateSkills(skills: Skill[]): Skill[] {
    const uniqueByName = new Map<string, Skill>();
    for (const skill of skills) {
      const normalized = skill.name.toLowerCase();
      if (!uniqueByName.has(normalized)) {
        uniqueByName.set(normalized, skill);
      }
    }
    return [...uniqueByName.values()];
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

  private showEmergencySuggestions(): void {
    this.suggestions = this.emergencySuggestionNames.map((name, index) => ({
      id: 200000 + index,
      name,
      group: `Emergency-${index + 1}`,
      general_popularity: 100 - index,
      popularity_in_group: 100 - index,
      group_popularity: 100 - index,
    }));
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

  private areSkillListsEqual(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < left.length; index += 1) {
      if (left[index].toLowerCase() !== right[index].toLowerCase()) {
        return false;
      }
    }

    return true;
  }

  private toLowerSet(values: string[]): Set<string> {
    return new Set(values.map((value) => value.toLowerCase()));
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

  private findSkillByName(name: string): Skill | null {
    const normalized = name.toLowerCase();
    return this.allSkills.find((skill) => skill.name.toLowerCase() === normalized) ?? null;
  }

  private resolveSelectedGroupsState(): {
    lastGroup: string | null;
    orderedGroups: string[];
  } {
    const orderedGroups: string[] = [];
    const seenGroups = new Set<string>();

    for (const selectedName of this.selectedSkills) {
      const skill = this.findSkillByName(selectedName);
      if (!skill || seenGroups.has(skill.group)) {
        continue;
      }
      seenGroups.add(skill.group);
      orderedGroups.push(skill.group);
    }

    const lastSelected = this.selectedSkills[this.selectedSkills.length - 1];
    const lastGroup = lastSelected ? this.findSkillByName(lastSelected)?.group ?? null : null;

    if (lastGroup) {
      const withoutLast = orderedGroups.filter((group) => group !== lastGroup);
      return {
        lastGroup,
        orderedGroups: [lastGroup, ...withoutLast],
      };
    }

    return { lastGroup: null, orderedGroups };
  }

  private synchronizeSuggestions(): void {
    if (this.allSkills.length === 0) {
      this.showEmergencySuggestions();
      return;
    }

    const excludedNames = this.toLowerSet(this.selectedSkills);
    const groupState = this.resolveSelectedGroupsState();
    const result: Skill[] = [];
    const usedSkillIds = new Set<number>();

    if (groupState.orderedGroups.length > 0) {
      const priorityCount = groupState.lastGroup
        ? Math.min(this.lastGroupPriorityCount, this.selectedGroupsSuggestionsCount)
        : 0;

      if (groupState.lastGroup && priorityCount > 0) {
        this.fillFromSingleGroup(
          groupState.lastGroup,
          priorityCount,
          excludedNames,
          usedSkillIds,
          result
        );
      }

      const remainingGroupFocused = Math.max(
        0,
        this.selectedGroupsSuggestionsCount - result.length
      );

      if (remainingGroupFocused > 0) {
        this.fillFromSelectedGroups(
          groupState.orderedGroups,
          remainingGroupFocused,
          excludedNames,
          usedSkillIds,
          result
        );
      }
    }

    const remainingCount = Math.max(0, this.targetSuggestionsCount - result.length);
    if (remainingCount > 0) {
      this.fillFromGlobalPool(remainingCount, excludedNames, usedSkillIds, result);
    }

    this.suggestions = result;

    if (this.isAutocompleteOpen) {
      this.refreshAutocompleteSuggestions();
    }
  }

  private fillFromSingleGroup(
    group: string,
    count: number,
    excludedNames: Set<string>,
    usedSkillIds: Set<number>,
    result: Skill[]
  ): void {
    let guard = 0;
    while (result.length < count && guard < 80) {
      guard += 1;
      const candidate = this.selectSkillFromGroup(group, excludedNames, usedSkillIds, true)
        ?? this.selectSkillFromGroup(group, excludedNames, usedSkillIds, false);
      if (!candidate) {
        break;
      }
      this.pushSuggestion(candidate, excludedNames, usedSkillIds, result);
    }
  }

  private fillFromSelectedGroups(
    groups: string[],
    needed: number,
    excludedNames: Set<string>,
    usedSkillIds: Set<number>,
    result: Skill[]
  ): void {
    let added = 0;
    let guard = 0;

    while (added < needed && guard < 120) {
      guard += 1;
      let progressed = false;

      for (const group of groups) {
        if (added >= needed) {
          break;
        }

        const candidate = this.selectSkillFromGroup(group, excludedNames, usedSkillIds, true)
          ?? this.selectSkillFromGroup(group, excludedNames, usedSkillIds, false);

        if (!candidate) {
          continue;
        }

        this.pushSuggestion(candidate, excludedNames, usedSkillIds, result);
        added += 1;
        progressed = true;
      }

      if (!progressed) {
        break;
      }
    }
  }

  private fillFromGlobalPool(
    needed: number,
    excludedNames: Set<string>,
    usedSkillIds: Set<number>,
    result: Skill[]
  ): void {
    let added = 0;
    let guard = 0;

    while (added < needed && guard < 200) {
      guard += 1;

      const nonRecentCandidates = this.allSkills.filter((skill) =>
        this.isCandidateAvailable(skill, excludedNames, usedSkillIds, true)
      );
      const anyCandidates = this.allSkills.filter((skill) =>
        this.isCandidateAvailable(skill, excludedNames, usedSkillIds, false)
      );

      const pool = nonRecentCandidates.length > 0 ? nonRecentCandidates : anyCandidates;
      if (pool.length === 0) {
        break;
      }

      const candidate = this.selectWeightedSkill(pool, (skill) =>
        skill.general_popularity + skill.popularity_in_group
      );
      if (!candidate) {
        break;
      }

      this.pushSuggestion(candidate, excludedNames, usedSkillIds, result);
      added += 1;
    }
  }

  private isCandidateAvailable(
    skill: Skill,
    excludedNames: Set<string>,
    usedSkillIds: Set<number>,
    avoidRecentlyShown: boolean
  ): boolean {
    const normalizedName = skill.name.toLowerCase();
    if (excludedNames.has(normalizedName)) {
      return false;
    }
    if (usedSkillIds.has(skill.id)) {
      return false;
    }
    if (avoidRecentlyShown && this.isRecentlyShown(skill.id)) {
      return false;
    }
    return true;
  }

  private selectSkillFromGroup(
    group: string,
    excludedNames: Set<string>,
    usedSkillIds: Set<number>,
    avoidRecentlyShown: boolean
  ): Skill | null {
    const groupSkills = this.groupedSkills[group] ?? [];
    const candidates = groupSkills.filter((skill) =>
      this.isCandidateAvailable(skill, excludedNames, usedSkillIds, avoidRecentlyShown)
    );

    if (candidates.length === 0) {
      return null;
    }

    return this.selectWeightedSkill(candidates, (skill) => skill.popularity_in_group);
  }

  private selectWeightedSkill(
    candidates: Skill[],
    getWeight: (skill: Skill) => number
  ): Skill | null {
    if (candidates.length === 0) {
      return null;
    }

    const weightedCandidates = candidates.map((skill) => ({
      skill,
      weight: Math.max(0, getWeight(skill)),
    }));

    const totalWeight = weightedCandidates.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) {
      return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
    }

    let random = Math.random() * totalWeight;
    for (const item of weightedCandidates) {
      random -= item.weight;
      if (random <= 0) {
        return item.skill;
      }
    }

    return weightedCandidates[weightedCandidates.length - 1]?.skill ?? null;
  }

  private pushSuggestion(
    suggestion: Skill,
    excludedNames: Set<string>,
    usedSkillIds: Set<number>,
    result: Skill[]
  ): void {
    result.push(suggestion);
    excludedNames.add(suggestion.name.toLowerCase());
    usedSkillIds.add(suggestion.id);
    this.pushRecentlyShown(suggestion.id);
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

  private closeAutocomplete(): void {
    this.isAutocompleteOpen = false;
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

    this.finalizeAddedSkill(skillName);
  }

  private refreshAutocompleteSuggestions(): void {
    const currentQuery = this.userInputControl.value.trim().toLowerCase();
    const excludedNames = new Set<string>([
      ...this.selectedSkills.map((skill) => skill.toLowerCase()),
      ...this.suggestions.map((skill) => skill.name.toLowerCase()),
    ]);

    const pool = this.getAutocompletePool()
      .filter((name) => !excludedNames.has(name.toLowerCase()))
      .filter((name) => !currentQuery || name.toLowerCase().includes(currentQuery));

    const shuffled = this.shuffleStrings(pool);
    this.autocompleteSuggestions = shuffled.slice(0, this.autocompleteLimit);
  }

  private getAutocompletePool(): string[] {
    if (this.allSkills.length > 0) {
      return [...new Set(this.allSkills.map((skill) => skill.name))];
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

    this.finalizeAddedSkill(suggestion.name);
  }

  removeSelectedSkill(skillToRemove: string): void {
    const initialLength = this.selectedSkills.length;
    this.selectedSkills = this.selectedSkills.filter(
      (skill) => skill.toLowerCase() !== skillToRemove.toLowerCase()
    );

    if (this.selectedSkills.length === initialLength) {
      return;
    }

    this.selectedSkillsChange.emit(this.selectedSkills.join(', '));
    this.keepSuggestionsStableAfterRemove();
    this.refreshAutocompleteSuggestions();
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

    this.finalizeAddedSkill(normalizedValue);
  }

  private finalizeAddedSkill(addedSkillName: string): void {
    this.userInputControl.setValue('');
    this.selectedSkillsChange.emit(this.selectedSkills.join(', '));
    this.keepSuggestionsStableAfterAdd(addedSkillName);
    this.refreshAutocompleteSuggestions();
  }

  private keepSuggestionsStableAfterAdd(addedSkillName: string): void {
    const normalizedAdded = addedSkillName.toLowerCase();

    this.suggestions = this.suggestions.filter(
      (skill) => skill.name.toLowerCase() !== normalizedAdded
    );

    this.fillSuggestionsDeterministically();
  }

  private keepSuggestionsStableAfterRemove(): void {
    this.fillSuggestionsDeterministically();
  }

  private fillSuggestionsDeterministically(): void {

    if (this.suggestions.length >= this.targetSuggestionsCount || this.allSkills.length === 0) {
      return;
    }

    const excludedNames = new Set<string>([
      ...this.selectedSkills.map((skill) => skill.toLowerCase()),
      ...this.suggestions.map((skill) => skill.name.toLowerCase()),
    ]);
    const usedIds = new Set<number>(this.suggestions.map((skill) => skill.id));

    const replacements = this.allSkills
      .filter((skill) => !excludedNames.has(skill.name.toLowerCase()) && !usedIds.has(skill.id))
      .sort(
        (left, right) =>
          right.general_popularity + right.popularity_in_group
          - (left.general_popularity + left.popularity_in_group)
      );

    for (const replacement of replacements) {
      if (this.suggestions.length >= this.targetSuggestionsCount) {
        break;
      }

      this.suggestions = [...this.suggestions, replacement];
      excludedNames.add(replacement.name.toLowerCase());
      usedIds.add(replacement.id);
    }
  }

  onRefreshSuggestions(): void {
    this.recentlyShownSkillIds = [];
    this.synchronizeSuggestions();
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

    this.selectedSkills = [...this.selectedSkills, skillName];
    return true;
  }
}