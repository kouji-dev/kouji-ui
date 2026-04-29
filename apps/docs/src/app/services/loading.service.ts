import { Injectable, signal } from '@angular/core';

/**
 * Controls the global loading screen visibility.
 * Call `hide()` once the app is ready to show content.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  readonly isLoading = signal(true);

  hide(): void {
    this.isLoading.set(false);
  }
}
