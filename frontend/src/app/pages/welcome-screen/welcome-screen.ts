import { Component, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { LoggingDto } from '../../core/models/loggingDto';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { Registration } from './registration/registration';

import { MainPage } from '../../shared/main-page/main-page';
import { Navbar } from '../../shared/navbar/navbar';

type FeatureCard = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  mobileImageUrl: string;
};

@Component({
  selector: 'app-welcome-screen',
  standalone: true,
  imports: [NgTemplateOutlet, Registration, MainPage, Navbar],
  templateUrl: './welcome-screen.html',
  styleUrl: './welcome-screen.css',
})
export class WelcomeScreen {
  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {
    this.handleGoogleOAuthCallback();
  }

  protected readonly featureCards: FeatureCard[] = [
    {
      id: 'summary',
      title: 'Our mission and principles',
      description:
        'We want to show students the best path to get an internship. We want to show them what they need to learn and how to do it. We want to show them how to get an internship and how to prepare for it.',
      imageUrl: 'https://picsum.photos/seed/desk-summary/1280/800',
      mobileImageUrl: 'https://picsum.photos/seed/mob-summary/600/1200',
    },
    {
      id: 'pipeline',
      title: 'Smart Internship Pipeline',
      description:
        'Track your application status, manage interviews, and keep all your job search activities in one place. Never miss a deadline again.',
      imageUrl: 'https://picsum.photos/seed/desk-pipeline/1280/800',
      mobileImageUrl: 'https://picsum.photos/seed/mob-pipeline/600/1200',
    },
    {
      id: 'knowledge',
      title: 'Knowledge & Skills Hub',
      description:
        'Access a library of resources, tutorials, and guides specifically chosen for your career path. Learn the skills that actually matter.',
      imageUrl: 'https://picsum.photos/seed/desk-knowledge/1280/800',
      mobileImageUrl: 'https://picsum.photos/seed/mob-knowledge/600/1200',
    },
  ];

  protected activeFeatureId = signal<string>(this.featureCards[0].id);
  protected username = signal<string>('');
  protected password = signal<string>('');
  protected showErrorWidget = signal<boolean>(false);
  protected loginError = signal<string>('');
  protected Login() : void {
    const LoginDto : LoggingDto = {
      username: this.username(),
      password: this.password(),
    };
    this.authService
      .login(LoginDto)
      .then(() => {
        // Zmiana aiapi -> ai/ask
        // this.router.navigate(['/ai/ask']);
        this.router.navigate(['/dashboard']);
      })
      .catch((err: unknown) => {
        if (this.username().trim() === '' || this.password().trim() === '') {
          this.loginError.set('Wypełnij oba pola.');
        } else {
          this.loginError.set(this.extractErrorMessage(err, 'Nieprawidłowa nazwa użytkownika lub hasło.'));
        }
        this.showErrorWidget.set(true);
      });
  }

  protected loginWithGoogle(): void {
    this.authService.googleLogin();
  }
  protected setActiveFeature(featureId: string): void {
    this.activeFeatureId.set(featureId);
  }

  protected isFeatureActive(featureId: string): boolean {
    return this.activeFeatureId() === featureId;
  }

  protected onFeatureHover(featureId: string): void {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
      this.setActiveFeature(featureId);
    }
  }

  protected onUsernameInput(event: Event): void {
    this.username.set(this.getInputValue(event));
  }

  protected onPasswordInput(event: Event): void {
    this.password.set(this.getInputValue(event));
  }

  protected onLoginSubmit(event: Event): void {
    event.preventDefault();

    const user = this.username().trim();
    const pass = this.password().trim();

    if (!user || !pass) {
      this.loginError.set('Wypełnij oba pola.');
      this.showErrorWidget.set(true);
      return;
    }

    this.showErrorWidget.set(false);
    this.Login();
  }

  protected onForgotPasswordClick(): void {
    this.loginError.set('Opcja przypomnienia hasła będzie dostępna wkrótce.');
    this.showErrorWidget.set(true);
  }

  protected dismissErrorWidget(): void {
    this.showErrorWidget.set(false);
  }

  private getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private handleGoogleOAuthCallback(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const username = params.get('username');

    if (!token) {
      return;
    }

    this.authService.setAccessToken(token);
    if (username) {
      localStorage.setItem('username', username);
    }
    // Zmiana aiapi -> ai/ask
    window.history.replaceState({}, document.title, window.location.pathname);
    this.router.navigate(['/ai/ask']);
  }

  protected showRegistration = signal(false);
  protected openRegistration() {
    this.showRegistration.set(true);
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    if (!(err instanceof HttpErrorResponse)) {
      return fallback;
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

    return fallback;
  }

}