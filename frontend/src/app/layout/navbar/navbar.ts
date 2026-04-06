import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowRightOnRectangle,
  heroSparkles,
  heroChartBarSquare,
  heroClipboardDocumentList
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
      heroClipboardDocumentList
    })
  ]
})
export class Navbar {
  constructor(private router: Router) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
