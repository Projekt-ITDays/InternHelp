import { Component } from '@angular/core';

type FeatureCard = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  caption: string;
};

@Component({
  selector: 'app-welcome-screen',
  imports: [],
  templateUrl: './welcome-screen.html',
  styleUrl: './welcome-screen.css',
})
export class WelcomeScreen {
  protected readonly featureCards: FeatureCard[] = [
    {
      id: 'summary',
      title: 'Automatyczne streszczenia rozmow z AI',
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc tincidunt lectus in dui dictum, sit amet laoreet massa sodales.',
      imageUrl: 'https://picsum.photos/seed/internhelp-summary/1280/800',
      caption: 'Lorem panel: szybkie podsumowanie kandydatow.',
    },
    {
      id: 'pipeline',
      title: 'Panel postepu rekrutacji na zywo',
      description:
        'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Integer pretium ligula at sem feugiat, nec pulvinar massa tristique.',
      imageUrl: 'https://picsum.photos/seed/internhelp-pipeline/1280/800',
      caption: 'Lorem panel: status i etapy procesu.',
    },
    {
      id: 'knowledge',
      title: 'Baza wiedzy dla internow zespolu',
      description:
        'Curabitur non justo et magna auctor volutpat. Duis sodales mi sed ligula luctus, vitae venenatis orci faucibus.',
      imageUrl: 'https://picsum.photos/seed/internhelp-knowledge/1280/800',
      caption: 'Lorem panel: wiedza i onboarding w jednym.',
    },
  ];

  protected activeFeatureId = this.featureCards[0]!.id;
  protected username = '';
  protected password = '';
  protected showErrorWidget = false;
  protected errorMessage = 'Wypelnij oba pola.';

  protected setActiveFeature(featureId: string): void {
    this.activeFeatureId = featureId;
  }

  protected isFeatureActive(featureId: string): boolean {
    return this.activeFeatureId === featureId;
  }

  protected onFeatureHover(featureId: string): void {
    if (!this.canUseHover()) {
      return;
    }

    this.setActiveFeature(featureId);
  }

  protected onUsernameInput(event: Event): void {
    this.username = this.getInputValue(event);
  }

  protected onPasswordInput(event: Event): void {
    this.password = this.getInputValue(event);
  }

  protected onLoginSubmit(event: Event): void {
    event.preventDefault();

    const normalizedUsername = this.username.trim();
    const normalizedPassword = this.password.trim();

    if (!normalizedUsername || !normalizedPassword) {
      this.showError('Wypelnij oba pola.');
      return;
    }

    if (normalizedUsername !== 'lorem' || normalizedPassword !== 'ipsum') {
      this.showError('Niepoprawny login lub haslo.');
      return;
    }

    this.showErrorWidget = false;
  }

  protected onRegisterClick(): void {
    this.showError('Rejestracja bedzie dostepna wkrotce.');
  }

  protected onForgotPasswordClick(): void {
    this.showError('Opcja przypomnienia hasla bedzie dostepna wkrotce.');
  }

  protected dismissErrorWidget(): void {
    this.showErrorWidget = false;
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.showErrorWidget = true;
  }

  private getInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private canUseHover(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
  }
}
