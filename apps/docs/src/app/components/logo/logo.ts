import { Component, input } from '@angular/core';

@Component({
  selector: 'kj-logo',
  standalone: true,
  templateUrl: './logo.html',
  styleUrl: './logo.css',
})
export class LogoComponent {
  /** Set to true to play the full entrance animation */
  animate = input<boolean>(false);
  /** Size in pixels (default 64) */
  size = input<number>(64);
}
