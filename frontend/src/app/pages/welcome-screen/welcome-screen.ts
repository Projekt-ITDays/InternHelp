import { Component, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NgxCaptchaModule } from 'ngx-captcha';
import { AuthService } from '../../service/auth.service';
import { LoggingDto } from '../../interfaces/loggingDto';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { MainPage } from '../../main-page/main-page';
import { Navbar } from '../../layout/navbar/navbar';
import { HttpErrorResponse } from '@angular/common/http';

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
  imports: [NgTemplateOutlet, MainPage, Navbar, NgxCaptchaModule],
  templateUrl: './welcome-screen.html',
  styleUrl: './welcome-screen.css',
})
export class WelcomeScreen implements OnInit, OnDestroy {
  @ViewChild('captchaElem') private captchaElem?: any;
  private onResize?: () => void;

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
  protected captchaToken = signal<string | null>(null);
  protected showErrorWidget = signal<boolean>(false);
  protected errorMessage = signal<string>('Wypełnij oba pola.');
  protected isMobileViewport = signal<boolean>(false);

  protected readonly recaptchaSiteKey = '6LeRc7wsAAAAAGHJSrbmGlv4UqiO6C7ug812Lkcy';

  ngOnInit(): void {
    this.updateViewportMode();

    if (typeof window !== 'undefined') {
      this.onResize = () => this.updateViewportMode();
      window.addEventListener('resize', this.onResize);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined' && this.onResize) {
      window.removeEventListener('resize', this.onResize);
    }
  }

  protected handleCaptchaSuccess(token: string | Event): void {
    const resolvedToken = typeof token === 'string' ? token : '';
    this.captchaToken.set(resolvedToken || null);
  }

  protected handleCaptchaExpired(): void {
    this.captchaToken.set(null);
  }

  protected async Login(): Promise<void> {
    if (!this.captchaToken()) {
      Swal.fire({
        icon: 'error',
        title: 'Brak CAPTCHA',
        text: 'Zaznacz pole "Nie jestem robotem".',
      });
      return;
    }

    const LoginDto: LoggingDto = {
      username: this.username(),
      password: this.password(),
      captchaToken: this.captchaToken() || '',
    };
    try {
      await this.authService.login(LoginDto);
    } catch (error: unknown) {
      const baseMessage = this.extractLoginErrorMessage(error);
      const message = this.normalizeCaptchaMessage(baseMessage);

      this.resetCaptchaState();

      Swal.fire({
        icon: 'error',
        title: 'Błąd logowania',
        text: message,
      });
      console.log('Błąd logowania:', error);
      this.showError(message);
      return;
    }

    await this.router.navigate(['/dashboard']);
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

  protected async onLoginSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const user = this.username().trim();
    const pass = this.password().trim();

    if (!user || !pass) {
      this.showError('Wypełnij oba pola.');
      return;
    }

    this.showErrorWidget.set(false);
    await this.Login();
  }

  protected onRegisterClick(): void {}

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

  private extractLoginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiError = error.error;

      if (typeof apiError === 'string' && apiError.trim()) {
        return apiError;
      }

      if (apiError && typeof apiError.message === 'string' && apiError.message.trim()) {
        return apiError.message;
      }

      if (Array.isArray(apiError?.message) && apiError.message.length > 0) {
        return apiError.message[0];
      }

      if (error.status === 0) {
        return 'Brak połączenia z serwerem.';
      }
    }

    return 'Niepoprawny login lub hasło.';
  }

  private normalizeCaptchaMessage(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('captcha')) {
      return 'Weryfikacja CAPTCHA nieudana. Zaznacz CAPTCHA ponownie i spróbuj jeszcze raz.';
    }
    return message;
  }

  private resetCaptchaState(): void {
    this.captchaToken.set(null);
    this.captchaElem?.resetCaptcha?.();
  }

  private updateViewportMode(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.isMobileViewport.set(window.innerWidth <= 900);
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
