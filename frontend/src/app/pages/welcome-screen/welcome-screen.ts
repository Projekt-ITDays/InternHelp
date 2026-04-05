import { Component, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AuthService } from '../../service/auth.service';
import { LoggingDto } from '../../interfaces/loggingDto';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { MainPage } from '../../main-page/main-page';
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
  imports: [NgTemplateOutlet ,MainPage],
  templateUrl: './welcome-screen.html',
  styleUrl: './welcome-screen.css',
})
export class WelcomeScreen {
  constructor(
    private readonly router: Router,
    private readonly authService: AuthService
  ) {
    this.handleGoogleOAuthCallback();
  }

  protected readonly featureCards: FeatureCard[] = [
    {
      id: 'summary',
      title: 'Our mission and principles',
      description: 'We want to show students the best path to get an internship. We want to show them what they need to learn and how to do it. We want to show them how to get an internship and how to prepare for it.',
      imageUrl: 'https://picsum.photos/seed/desk-summary/1280/800',
      mobileImageUrl: 'https://picsum.photos/seed/mob-summary/600/1200',
    },
    {
      id: 'pipeline',
      title: 'PlaceHolder',
      description: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Integer pretium ligula at sem feugiat, nec pulvinar massa tristique.',
      imageUrl: 'https://picsum.photos/seed/desk-pipeline/1280/800',
      mobileImageUrl: 'https://picsum.photos/seed/mob-pipeline/600/1200',
    },
    {
      id: 'knowledge',
      title: 'PlaceHolder',
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
  protected Login(): void {
    const LoginDto: LoggingDto = {
      username: this.username(),
      password: this.password()
    }
    this.authService.login(LoginDto)
      .then(() => {
        // Zmiana aiapi -> ai/ask
        this.router.navigate(['/ai/ask']);
      })
      .catch(() => {
        Swal.fire({
          icon: 'error',
          title: 'Błąd logowania',
          text: 'Niepoprawny login lub hasło.',
        });
        // placeholder - > używać jeżeli nie chcemy korzystać z logowania i autoryzacji
        // dalej tego używam btw
        // this.router.navigate(['/ai/ask']);

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
    // Zmiana aiapi -> ai/ask
    window.history.replaceState({}, document.title, window.location.pathname);
    this.router.navigate(['/ai/ask']);
  }
}