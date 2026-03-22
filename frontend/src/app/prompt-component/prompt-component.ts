import { ChangeDetectorRef, Component } from '@angular/core';
import { Ai } from '../service/ai';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; 

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
  // response = ''; 
  loading = false;

  // Zamiast zwykłego stringa, przechowujemy przetworzoną tablicę wyników
  results: any[] = [];

  // Zestaw ikon do przypisania dla kolejnych kart
  icons = ['🎮', '👥', '🐞', '🚀', '💡', '🛡️'];

  constructor(private ai: Ai, private cdr: ChangeDetectorRef) {}

  sendRequest() {
    if (!this.prompt.trim()) return;

    this.loading = true;
    this.results = []; // Czyścimy poprzednie wyniki
    const currentPrompt = this.prompt;
    this.prompt = '';

    this.ai.askGemini(currentPrompt).subscribe({
      next: (data: any) => {
        // data.answer to teraz nasz piękny obiekt JSON z backendu
        const jsonResponse = data.answer;
        
        // Zamieniamy obiekt w tablicę, żeby użyć *ngFor w HTML
        this.results = Object.keys(jsonResponse).map(key => {
          return {
            title: key,
            description: jsonResponse[key].description,
            tags: jsonResponse[key].examples
          };
        });

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
