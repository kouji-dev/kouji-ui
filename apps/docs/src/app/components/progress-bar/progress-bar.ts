import { Component, ChangeDetectionStrategy, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';

const APPEAR_DELAY_MS = 30;

@Component({
  selector: 'kj-progress-bar',
  standalone: true,
  template: `<div class="kj-progress-bar" [class.active]="active()" aria-hidden="true"></div>`,
  styleUrl: './progress-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  protected readonly active = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const router = inject(Router);
    const destroyRef = inject(DestroyRef);
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    if (!isBrowser) return;

    router.events.pipe(takeUntilDestroyed(destroyRef)).subscribe(e => {
      if (e instanceof NavigationStart) {
        this.timer = setTimeout(() => this.active.set(true), APPEAR_DELAY_MS);
      } else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) {
        if (this.timer !== null) {
          clearTimeout(this.timer);
          this.timer = null;
        }
        this.active.set(false);
      }
    });
  }
}
