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
  // response = ''; 
  loading = false;
  errorMessage = '';

  results: any[] = [];

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
    this.results = []; 
    const currentPrompt = this.prompt;
    this.prompt = '';

    this.ai.askGemini(currentPrompt).subscribe({
      next: (data: any) => {
        const jsonResponse = data.answer;
        
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
  goToRoadmap(pathName: string) {
    this.router.navigate(['/ai/roadmap', encodeURIComponent(pathName)]);
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