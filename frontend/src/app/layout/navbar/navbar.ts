import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroCog6Tooth,
  heroBell,
  heroMagnifyingGlass,
} from '@ng-icons/heroicons/outline';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  providers: [
    provideIcons({
      heroCog6Tooth,
      heroBell,
      heroMagnifyingGlass,
    }),
  ],
})
export class Navbar {
  private notificationService = inject(NotificationService);
  notifications = this.notificationService.notifications;
}
