import { Component, signal, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Ai } from './ai';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
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


