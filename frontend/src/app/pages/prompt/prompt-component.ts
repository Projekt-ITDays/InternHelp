import { ChangeDetectorRef, Component } from '@angular/core';
import { Ai } from '../../core/services/ai';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Navbar } from '../../shared/navbar/navbar';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-prompt-component',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    Navbar
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
  results = {};
  // Emotki (placeholder)
  icons = ['🎮', '👥', '🐞', '🚀', '💡', '🛡️'];

  constructor(
    private ai: Ai,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

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
        this.errorMessage = this.extractErrorMessage(err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setPrompt(text: string) {
    this.prompt = text;
  }
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  goToRoadmapList() {
    this.router.navigate(['/ai/roadmap']);
  }

  goToSurvey() {
    this.router.navigate(['/survey']);
  }

  private extractErrorMessage(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';
    }

    const backendError = err.error;
    if (typeof backendError === 'string' && backendError.trim()) {
      return backendError;
    }

    if (Array.isArray(backendError?.message) && backendError.message.length > 0) {
      return backendError.message[0];
    }

    if (typeof backendError?.message === 'string' && backendError.message.trim()) {
      return backendError.message;
    }

    if (err.status === 0) {
      return 'Brak połączenia z serwerem. Sprawdź sieć i spróbuj ponownie.';
    }

    return 'Nie udało się wygenerować planu. Spróbuj ponownie za chwilę.';
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