import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SurveyDto } from '../../core/models/survey';
import { SurveyService } from '../../core/services/survey.service';
import { Navbar } from '../../shared/navbar/navbar';
import { UczelniaComponent } from './uczelnia/uczelnia';

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [FormsModule, Navbar, UczelniaComponent],
  templateUrl: './survey.html',
  styleUrl: './survey.css',
})
export class Survey {
    constructor(private readonly surveyService: SurveyService){}
    timeRangestoChoose = [3, 6, 9, 12, 24];
    abilityLevels = ['Beginner', 'Junior', 'Mid', 'Advanced'];

    surveyModel: SurveyDto = {
      userId: '',
      Major: '',
      YearOfStudy: 1,
      PreferredInternshipType: '',
      TimeLeft: 3,
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
        this.surveyModel.TimeLeft = Number(this.surveyModel.TimeLeft);
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
}
