import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SurveyDto } from '../../core/models/survey';
import { SurveyService } from '../../core/services/survey.service';
import { Ai } from '../../core/services/ai';
import { AuthService } from '../../core/services/auth.service';
import { Navbar } from '../../shared/navbar/navbar';
import { CommonModule } from '@angular/common';
import { UniversityPickerComponent } from './uczelnia/uczelnia';
import { SkillsChipsComponent } from './skills-chips/skills-chips';
import { HardSkillsChipsComponent } from './hard-skills-chips/hard-skills-chips';
import { TimeLeftPickerComponent } from './time-left-picker/time-left-picker';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroClock, heroArrowDownOnSquare, heroArrowPath } from '@ng-icons/heroicons/outline';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    Navbar,
    UniversityPickerComponent,
    SkillsChipsComponent,
    HardSkillsChipsComponent,
    TimeLeftPickerComponent,
    NgIconComponent
  ],
  templateUrl: './survey.html',
  styleUrl: './survey.css',
  providers: [
    provideIcons({ heroXMark, heroClock, heroArrowDownOnSquare, heroArrowPath })
  ]
})
export class Survey implements OnInit {
  constructor(
    private readonly surveyService: SurveyService,
    private readonly aiService: Ai,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) { }

  userSurveys: any[] = [];
  showProfiles: boolean = false;
  isLoading: boolean = false;

  async ngOnInit() {
    const hasToken = await this.authService.ensureAccessToken();
    if (hasToken) {
      await this.refreshHistory(true);
    }
  }

  async refreshHistory(autoSelect: boolean = false) {
    try {
      this.userSurveys = await this.aiService.getUserSurveys();
      if (autoSelect && this.userSurveys.length > 0) {
        this.onSurveySelect(this.userSurveys[0]);
      }
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    } catch (e) {
      console.error('Błąd pobierania historii:', e);
    }
  }

  async onRestoreLatest() {
    this.isLoading = true;
    await this.refreshHistory(true);
    this.isLoading = false;

    Swal.fire({
      title: 'Wczytano',
      text: 'Przywrócono ostatni zapisany profil.',
      icon: 'success',
      toast: true,
      position: 'top-end',
      timer: 2000,
      showConfirmButton: false
    });
  }

  onSurveySelect(survey: any) {
    if (!survey) return;

    this.surveyModel = {
      ...this.surveyModel,
      Major: survey.Major || '',
      YearOfStudy: Number(survey.YearOfStudy || 1),
      PreferredInternshipType: survey.PreferredInternshipType || '',
      TimeLeft: Number(survey.TimeLeft || 6),
      Inrest: survey.Inrest || '',
      Expierience: survey.Expierience || '',
      skills: survey.skills || '',
      AbilitiesLevel: survey.AbilitiesLevel || 'Beginner',
      SideProjectsHobby: survey.SideProjectsHobby || '',
      Strengths: survey.Strengths || '',
      Weaknesses: survey.Weaknesses || '',
      University: survey.University || '',
      GraduationYear: Number(survey.GraduationYear || this.currentYear)
    };

    this.cdr.markForCheck();
    this.cdr.detectChanges();

    setTimeout(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 0);
  }

  async onDeleteSurvey(event: Event, id: number) {
    event.stopPropagation();
    try {
      await this.aiService.deleteUserSurvey(id);
      this.refreshHistory(false);
      // Opcjonalnie: mały toast zamiast wielkiego okna
      Swal.fire({
        title: 'Usunięto',
        icon: 'success',
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (e) {
      console.error('Błąd usuwania ankiety:', e);
    }
  }
  abilityLevels = ['Beginner', 'Junior', 'Mid', 'Advanced'];
  readonly currentYear = new Date().getFullYear();
  readonly minGraduationYear = this.currentYear - 21;
  readonly maxGraduationYear = this.currentYear + 8;
  readonly suggestedGraduationYears = [
    this.currentYear - 1,
    this.currentYear,
    this.currentYear + 1,
    this.currentYear + 2,
  ].filter((year) => year >= this.minGraduationYear && year <= this.maxGraduationYear);

  surveyModel: SurveyDto = {
    userId: '',
    Major: '',
    YearOfStudy: 1,
    PreferredInternshipType: '',
    TimeLeft: 6,
    Inrest: '',
    Expierience: '',
    skills: '',
    AbilitiesLevel: 'Beginner',
    SideProjectsHobby: '',
    Strengths: '',
    Weaknesses: '',
    University: '',
    GraduationYear: this.currentYear,
  };

  setGraduationYear(candidate: number): void {
    this.surveyModel.GraduationYear = this.clampGraduationYear(candidate);
  }

  onGraduationYearSliderInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.setGraduationYear(Number(target?.value));
  }

  onSaveOnly(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.prepareModel();
    this.surveyService.postSurvey(this.surveyModel).subscribe({
      next: async (response: any) => {
        // Czekamy na odświeżenie historii, żeby dropdown pokazał nową datę na górze
        await this.refreshHistory(false);
        this.isLoading = false;

        if (response && response.isDuplicate === true) {
          Swal.fire({
            title: 'Profil odświeżony',
            text: 'Ten profil jest teraz Twoim aktywnym profilem (skoczył na górę historii).',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            title: 'Zapisano!',
            text: 'Nowy profil został dodany i jest teraz aktywny.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error saving profile', error);
        Swal.fire('Błąd', 'Nie udało się zapisać profilu.', 'error');
      }
    });
  }

  onSubmit(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.prepareModel();
    this.surveyService.postSurvey(this.surveyModel).subscribe({
      next: (response: any) => {
        this.refreshHistory(false);
        this.isLoading = false;
        Swal.fire({
          title: 'Sukces!',
          text: 'Ankieta została zapisana. Przechodzimy do generowania planu...',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          this.router.navigate(['/prompt']);
        });
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error submitting survey', error);
        Swal.fire('Błąd', 'Wystąpił problem podczas wysyłania ankiety.', 'error');
      }
    });
  }

  private prepareModel(): void {
    this.surveyModel.userId = localStorage.getItem('userId') || '';
    this.surveyModel.TimeLeft = this.clampTimeLeft(Number(this.surveyModel.TimeLeft));
    this.surveyModel.YearOfStudy = Number(this.surveyModel.YearOfStudy);
    this.surveyModel.GraduationYear = this.clampGraduationYear(Number(this.surveyModel.GraduationYear));
    this.normalizeStrengthsWeaknesses();
  }

  private clampTimeLeft(candidate: number): number {
    if (!Number.isFinite(candidate)) {
      return 6;
    }

    return Math.min(12, Math.max(1, Math.round(candidate)));
  }

  private clampGraduationYear(candidate: number): number {
    if (!Number.isFinite(candidate)) {
      return this.currentYear;
    }

    return Math.min(this.maxGraduationYear, Math.max(this.minGraduationYear, Math.round(candidate)));
  }

  private normalizeStrengthsWeaknesses(): void {
    const strengths = this.parseSkillList(this.surveyModel.Strengths);
    const weaknesses = this.parseSkillList(this.surveyModel.Weaknesses);
    const strengthsSet = new Set(strengths.map((skill) => skill.toLowerCase()));
    const filteredWeaknesses = weaknesses.filter(
      (skill) => !strengthsSet.has(skill.toLowerCase())
    );

    this.surveyModel.Strengths = strengths.join(', ');
    this.surveyModel.Weaknesses = filteredWeaknesses.join(', ');
  }

  private parseSkillList(raw: string): string[] {
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const parsed = raw
      .split(',')
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0)
      .filter((skill) => {
        const normalized = skill.toLowerCase();
        if (seen.has(normalized)) {
          return false;
        }
        seen.add(normalized);
        return true;
      });

    return parsed;
  }
}
