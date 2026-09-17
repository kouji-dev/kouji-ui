import { Injectable, signal } from '@angular/core';

/**
 * Controls the global loading screen visibility.
 *
 * Seeded `false` on purpose. The docs site is prerendered (`outputMode:
 * "static"`), so every route ships its real content in the HTML — gating that
 * content behind a splash only browser JS can clear throws away the paint
 * benefit prerendering exists for, and leaves a no-JS client staring at a
 * branded overlay forever. The splash is now a browser-only affordance for
 * *client-side* transitions: call `show()` before a long transition and
 * `hide()` when it settles.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  /** Whether the full-screen splash is currently visible. */
  readonly isLoading = signal(false);

  /** Raise the splash (client-side transitions only). */
  show(): void {
    this.isLoading.set(true);
  }

  /** Clear the splash. */
  hide(): void {
    this.isLoading.set(false);
  }
}
