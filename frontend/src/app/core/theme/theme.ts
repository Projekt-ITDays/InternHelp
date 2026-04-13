import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDarkMode = signal<boolean>(localStorage.getItem('theme') === 'dark');

  constructor() {
    effect(() => {
      this.syncTheme();
    });
  }

  toggleTheme() {
    this.isDarkMode.update(v => !v);
  }

  private syncTheme() {
    const mode = this.isDarkMode() ? 'dark' : 'light';

    localStorage.setItem('theme', mode);

    document.documentElement.setAttribute('data-theme', mode);
    document.body.setAttribute('data-theme', mode);
  }
}