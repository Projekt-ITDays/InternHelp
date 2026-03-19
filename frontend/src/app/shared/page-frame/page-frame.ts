import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-frame',
  standalone: true,
  templateUrl: './page-frame.html',
  styleUrl: './page-frame.css',
})
export class PageFrameShell {
  @Input() title: string | null = null;
  @Input() hideTitleOnMobile = false;
}
