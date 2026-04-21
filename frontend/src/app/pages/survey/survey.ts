import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SurveyDto } from '../../core/models/survey';
import { SurveyService } from '../../core/services/survey.service';
import { Navbar } from '../../shared/navbar/navbar';
import { UniversityPickerComponent } from './uczelnia/uczelnia';
import { SkillsChipsComponent } from './skills-chips/skills-chips';
import { HardSkillsChipsComponent } from './hard-skills-chips/hard-skills-chips';
import { TimeLeftPickerComponent } from './time-left-picker/time-left-picker';

@Component({
  selector: 'app-survey',
  standalone: true,
    imports: [
        FormsModule,
        Navbar,
        UniversityPickerComponent,
        SkillsChipsComponent,
        HardSkillsChipsComponent,
        TimeLeftPickerComponent,
    ],
  templateUrl: './survey.html',
  styleUrl: './survey.css',
})
export class Survey {
    constructor(private readonly surveyService: SurveyService){}
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

    onSubmit(): void {
        this.surveyModel.userId = localStorage.getItem('userId') || '';
      this.surveyModel.TimeLeft = this.clampTimeLeft(Number(this.surveyModel.TimeLeft));
        this.surveyModel.YearOfStudy = Number(this.surveyModel.YearOfStudy);
        this.surveyModel.GraduationYear = this.clampGraduationYear(Number(this.surveyModel.GraduationYear));
        this.normalizeStrengthsWeaknesses();

        console.log('Submitting survey payload:', this.surveyModel, 'TimeLeft type:', typeof this.surveyModel.TimeLeft);

        this.surveyService.postSurvey(this.surveyModel).subscribe({
            next: (response) => {
                console.log('Survey submitted successfully', response);
                alert('Ankieta została pomyślnie przesłana!');
            },
            error: (error) => {
                console.error('Error submitting survey', error);
                alert('Wystąpił błąd podczas przesyłania ankiety. Proszę spróbować ponownie.');
            }
        })
        ;
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
