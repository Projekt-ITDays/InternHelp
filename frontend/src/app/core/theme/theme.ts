import { Injectable, effect, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private followSystemTheme = localStorage.getItem(THEME_STORAGE_KEY) === null;
  private themeReadyMarked = false;

  isDarkMode = signal<boolean>(this.getInitialTheme() === 'dark');

  constructor() {
    if (this.followSystemTheme) {
      this.systemThemeQuery.addEventListener('change', this.handleSystemThemeChange);
    }

    effect(() => {
      this.syncTheme();
    });
  }

  toggleTheme() {
    this.followSystemTheme = false;
    this.systemThemeQuery.removeEventListener('change', this.handleSystemThemeChange);

    const nextMode: ThemeMode = this.isDarkMode() ? 'light' : 'dark';

    localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    this.isDarkMode.set(nextMode === 'dark');
  }

  private syncTheme() {
    const mode = this.isDarkMode() ? 'dark' : 'light';

    if (this.followSystemTheme) {
      localStorage.removeItem(THEME_STORAGE_KEY);
    }

    document.documentElement.setAttribute('data-theme', mode);
    document.body.setAttribute('data-theme', mode);

    if (!this.themeReadyMarked) {
      this.markThemeReady();
    }
  }

  private getInitialTheme(): ThemeMode {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }

    return this.systemThemeQuery.matches ? 'dark' : 'light';
  }

  private handleSystemThemeChange = (event: MediaQueryListEvent) => {
    if (!this.followSystemTheme) {
      return;
    }

    this.isDarkMode.set(event.matches);
  };

  private markThemeReady() {
    this.themeReadyMarked = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.setAttribute('data-theme-ready', 'true');
      });
    });
  }
}