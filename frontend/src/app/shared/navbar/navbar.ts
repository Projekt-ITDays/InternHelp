import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { ThemeService } from '../../core/theme/theme';
import { AuthService } from '../../service/auth.service';
import {
  heroArrowRightOnRectangle,
  heroSparkles,
  heroChartBarSquare,
  heroClipboardDocumentList,
  heroMoon,
  heroSun
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  providers: [
    provideIcons({
      heroArrowRightOnRectangle,
      heroSparkles,
      heroChartBarSquare,
      heroClipboardDocumentList,
      heroMoon,
      heroSun
    })
  ]
})
export class Navbar implements OnInit {
  constructor(
    private router: Router,
    public themeService: ThemeService,
    private authService: AuthService
  ) {}

  username = '';
  userAbrivation = 'U';

  ngOnInit(): void {
    this.username = this.getStoredUsername();
    this.userAbrivation = this.createAbrivation(this.username);
  }

  private getStoredUsername(): string {
    const raw = localStorage.getItem('username') ?? '';
    return raw.trim();
  }

  private createAbrivation(username: string): string {
    if (!username) {
      return 'U';
    }

    const parts = username
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]}${parts[1]}`;
    }

    return username.slice(0, 2).toUpperCase();
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  isActive(path: string): boolean {
    if (path === '/') {
      return this.router.url === '/';
    }
    return this.router.url.startsWith(path);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.username = '';
    this.userAbrivation = 'U';
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}