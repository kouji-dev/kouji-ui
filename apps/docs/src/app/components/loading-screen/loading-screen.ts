import { Component, OnInit, signal } from '@angular/core';
import { LogoComponent } from '../logo/logo';

@Component({
  selector: 'kj-loading-screen',
  standalone: true,
  imports: [LogoComponent],
  templateUrl: './loading-screen.html',
  styleUrl: './loading-screen.css',
})
export class LoadingScreenComponent implements OnInit {
  protected readonly animateLogo = signal(false);

  ngOnInit(): void {
    // Trigger logo animation on next tick
    setTimeout(() => this.animateLogo.set(true), 50);
  }
}
