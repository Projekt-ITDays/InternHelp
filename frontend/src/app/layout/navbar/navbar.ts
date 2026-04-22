import { Component } from '@angular/core';
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
export class Navbar {
  constructor(
    private router: Router,
    public themeService: ThemeService,
    private authService: AuthService
  ) {}

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
    this.router.navigate(['/']);
  }
}