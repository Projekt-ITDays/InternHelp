import { Component } from '@angular/core';
import { BackgroundComponent } from './core/components/background/background';

@Component({
  selector: 'app-root',
  imports: [BackgroundComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}