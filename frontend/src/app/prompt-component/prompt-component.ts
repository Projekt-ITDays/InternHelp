import { ChangeDetectorRef, Component } from '@angular/core';
import { Ai } from '../service/ai';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router';

@Component({
  selector: 'app-prompt-component',
  imports: [
    FormsModule,
    CommonModule
  ],
  templateUrl: './prompt-component.html',
  styleUrl: './prompt-component.css',
})
export class PromptComponent {
  prompt = '';
  loading = false;
  errorMessage = '';

  responseMessage = '';
  planGenerated = false;

  // Emotki (placeholder)
  icons = ['🎮', '👥', '🐞', '🚀', '💡', '🛡️'];

  constructor(
    private ai: Ai, 
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  sendRequest() {
    if (!this.prompt.trim()) return;

    this.loading = true;
    this.errorMessage = '';
    this.responseMessage = '';
    this.planGenerated = false;
    
    const currentPrompt = this.prompt;
    this.prompt = '';

    const userId = localStorage.getItem('userId');
    if (!userId) {
      this.errorMessage = 'Brak identyfikatora użytkownika. Zaloguj się ponownie.';
      this.loading = false;
      return;
    }

    this.ai.submitSurveyPrompt(currentPrompt, userId).subscribe({
      next: (data: any) => {
        if (data.plan) {
          this.planGenerated = true;
          this.responseMessage = data.podsumowanie_profilu || 'Twój plan został pomyślnie wygenerowany i zapisany!';
        } else if (data.message) {
          this.responseMessage = data.message;
        } else {
          this.responseMessage = 'Otrzymano odpowiedź w nieznanym formacie.';
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Błąd zapytania:", err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  goToRoadmapList() {
    this.router.navigate(['/ai/roadmap']);
  }

  // sendRequest() {
  //   if (!this.prompt.trim()) return;

  //   this.loading = true;
  //   this.response = ''; 
  //   const currentPrompt = this.prompt;
  //   this.prompt = '';

  //   this.ai.askGemini(currentPrompt).subscribe({
  //     next: (data: any) => {
  //     this.response = data.answer; 
  //     this.loading = false;
  //     this.cdr.detectChanges();
  //     }
  //   });
  // }
}