import { ChangeDetectorRef, Component } from '@angular/core';
import { Ai } from '../service/ai';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-prompt-component',
  imports: [FormsModule, NgIf],
  templateUrl: './prompt-component.html',
  styleUrl: './prompt-component.css',
})
export class PromptComponent {
  prompt = '';
  response = ''; 
  loading = false;

  constructor(private ai: Ai, private cdr: ChangeDetectorRef) {}

  sendRequest() {
    if (!this.prompt.trim()) return;

    this.loading = true;
    this.response = ''; 
    const currentPrompt = this.prompt;
    this.prompt = '';

    this.ai.askGemini(currentPrompt).subscribe({
      next: (data: any) => {
      this.response = data.answer; 
      this.loading = false;
      this.cdr.detectChanges();
      }
    });
  }
}
