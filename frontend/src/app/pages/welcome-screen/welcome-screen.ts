import { Component, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AuthService } from '../../service/auth.service';
import { LoggingDto } from '../../interfaces/loggingDto';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { Registration } from './registration/registration';

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
  imports: [NgTemplateOutlet, NgTemplateOutlet, Registration],
  templateUrl: './welcome-screen.html',
  styleUrl: './welcome-screen.css',
})
export class WelcomeScreen {
  constructor(
    private readonly router : Router,
    private readonly authService : AuthService
  ){
    this.handleGoogleOAuthCallback();
  }

  protected readonly featureCards: FeatureCard[] = [
    {
      id: 'summary',
      title: 'Automatyczne streszczenia rozmów z AI',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc tincidunt lectus in dui dictum, sit amet laoreet massa sodales.',
      imageUrl: 'https://picsum.photos/seed/desk-summary/1280/800',
      mobileImageUrl: 'https://picsum.photos/seed/mob-summary/600/1200',
    },
    {
      id: 'pipeline',
      title: 'Panel postępu rekrutacji na żywo',
      description: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Integer pretium ligula at sem feugiat, nec pulvinar massa tristique.',
      imageUrl: 'https://picsum.photos/seed/desk-pipeline/1280/800',
      mobileImageUrl: 'https://picsum.photos/seed/mob-pipeline/600/1200',
    },
    {
      id: 'knowledge',
      title: 'Baza wiedzy dla internów zespołu',
      description: 'Curabitur non justo et magna auctor volutpat. Duis sodales mi sed ligula luctus, vitae venenatis orci faucibus.',
      imageUrl: 'https://picsum.photos/seed/desk-knowledge/1280/800',
      mobileImageUrl: 'https://picsum.photos/seed/mob-knowledge/600/1200',
    },
  ];

  protected activeFeatureId = signal<string>(this.featureCards[0].id);
  protected username = signal<string>('');
  protected password = signal<string>('');
  protected showErrorWidget = signal<boolean>(false);
  protected errorMessage = signal<string>('Wypełnij oba pola.');
  protected Login() : void {
    const LoginDto : LoggingDto = {
      username: this.username(),
      password: this.password()
    }
    this.authService.login(LoginDto)
      .then(() => {
        this.router.navigate(['/aiapi']);
      })
      .catch(() => {
        Swal.fire({
          icon: 'error',
          title: 'Błąd logowania',
          text: 'Niepoprawny login lub hasło.',
        });
        this.showError('Niepoprawny login lub hasło.');
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
      this.showError('Wypełnij oba pola.');
      return;
    }

    this.showErrorWidget.set(false);
    this.Login();
  }

  protected onRegisterClick(): void {
    this.showError('Rejestracja będzie dostępna wkrótce.');
  }

  protected onForgotPasswordClick(): void {
    this.showError('Opcja przypomnienia hasła będzie dostępna wkrótce.');
  }

  protected dismissErrorWidget(): void {
    this.showErrorWidget.set(false);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    this.showErrorWidget.set(true);
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

    window.history.replaceState({}, document.title, window.location.pathname);
    this.router.navigate(['/aiapi']);
  }

  protected showRegistration = signal(false);
  protected openRegistration() {
    this.showRegistration.set(true);
  }

}