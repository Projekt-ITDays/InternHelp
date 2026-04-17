import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  type: 'tip' | 'info' | 'warning';
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  notifications = signal<Notification[]>([
    {
      id: 1,
      type: 'tip',
      title: 'Test tip',
      message: 'test.',
    },
    {
      id: 2,
      type: 'info',
      title: 'test info',
      message: 'test.',
    },
    {
      id: 3,
      type: 'warning',
      title: 'test warning',
      message: 'test.',
    },
  ]);
}
