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
      GraduationYear: new Date().getFullYear(),
    };

    onSubmit(): void {
        this.surveyModel.userId = localStorage.getItem('userId') || '';
      this.surveyModel.TimeLeft = this.clampTimeLeft(Number(this.surveyModel.TimeLeft));
        this.surveyModel.YearOfStudy = Number(this.surveyModel.YearOfStudy);
        this.surveyModel.GraduationYear = Number(this.surveyModel.GraduationYear);

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
}
