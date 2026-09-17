import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { KjMotion } from '../motion';
import { KjReducedMotion } from '../reduced-motion';

/**
 * Reduced-motion behaviour. `KjReducedMotion.prefersReducedMotion()` reads the
 * OS setting as an SSR-safe signal; the same setting makes every `motion.css`
 * preset collapse to a ~1ms opacity fade with no transform (WCAG 2.1 AAA
 * 2.3.3). Toggle "Reduce motion" in your OS accessibility settings and hit
 * Replay to see the difference — the slide/scale movement disappears.
 */
@Component({
  selector: 'kj-example-motion-reduced',
  standalone: true,
  imports: [KjMotion],
  styleUrls: ['../motion.css', '../../styles/docs-themes.css'],
  styles: [
    `
      :host {
        display: block;
        padding: 2rem;
        background: var(--docs-bg);
        color: var(--docs-text);
        font-family: var(--docs-font);
      }
      .status {
        margin-bottom: 1.5rem;
        font-size: 0.875rem;
      }
      .status strong {
        color: var(--docs-accent);
      }
      .row {
        display: flex;
        gap: 1rem;
        align-items: center;
      }
      button {
        padding: 0.5rem 1.25rem;
        font-family: var(--docs-font);
        font-size: 0.875rem;
        background: var(--docs-accent);
        color: var(--docs-accent-on);
        border: var(--docs-btn-border);
        cursor: pointer;
      }
      .box {
        display: grid;
        place-items: center;
        width: 12rem;
        min-height: 4.5rem;
        font-size: 0.8125rem;
        background: var(--docs-surface);
        border: 1px solid var(--docs-border);
        color: var(--docs-text);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="status">
      Reduced motion preferred:
      <strong>{{ prefersReduced() ? 'yes — presets collapse to an instant fade' : 'no — full motion' }}</strong>
    </p>
    <div class="row">
      <button type="button" (click)="replay()">Replay</button>
      @for (n of [nonce()]; track n) {
        <div class="box" kjMotion="slide-up-fade">slide-up-fade</div>
      }
    </div>
  `,
})
export class MotionReducedExample {
  private readonly motion = inject(KjReducedMotion);
  readonly prefersReduced = computed(() => this.motion.prefersReducedMotion());
  readonly nonce = signal(0);

  replay(): void {
    this.nonce.update((n) => n + 1);
  }
}
