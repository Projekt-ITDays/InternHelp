import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SurveyDto } from '../interfaces/survey';
import { SurveyService } from '../service/survey.service';
import { Navbar } from '../layout/navbar/navbar';

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [FormsModule, Navbar],
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

    async onSubmit(): Promise<void> {
        this.surveyModel.userId = localStorage.getItem('userId') || '';
        console.log(this.surveyModel.userId);
        (await this.surveyService.postSurvey(this.surveyModel)).subscribe({
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
