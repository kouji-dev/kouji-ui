import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjMotion } from '../motion';

const PRESETS = [
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'scale',
  'slide-up-fade',
  'scale-spring',
] as const;

/**
 * Named motion presets applied with the `kjMotion` directive. Each card mounts
 * an element carrying a preset; hitting **Replay** remounts them so the
 * entrance keyframes fire again. Requires `@kouji-ui/core/motion/motion.css`.
 */
@Component({
  selector: 'kj-example-motion',
  standalone: true,
  imports: [KjMotion],
  styleUrls: ['../motion.css', '../../styles/docs-themes.css'],
  styles: [
    `
      :host {
        display: block;
        padding: 2rem;
        background: var(--kj-bg);
        color: var(--kj-text);
        font-family: var(--kj-font);
      }
      .toolbar {
        margin-bottom: 1.5rem;
      }
      button {
        padding: 0.5rem 1.25rem;
        font-family: var(--kj-font);
        font-size: 0.875rem;
        background: var(--kj-accent);
        color: var(--kj-accent-on);
        border: var(--kj-btn-border);
        cursor: pointer;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
        gap: 1rem;
      }
      .cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }
      .box {
        display: grid;
        place-items: center;
        width: 100%;
        min-height: 4.5rem;
        padding: 0.5rem;
        text-align: center;
        font-size: 0.75rem;
        background: var(--kj-surface);
        border: 1px solid var(--kj-border);
        color: var(--kj-text);
      }
      .label {
        font-size: 0.75rem;
        color: var(--kj-text-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <button type="button" (click)="replay()">Replay animations</button>
    </div>
    @for (n of [nonce()]; track n) {
      <div class="grid">
        @for (preset of presets; track preset) {
          <div class="cell">
            <div class="box" [kjMotion]="preset">{{ preset }}</div>
            <span class="label">{{ preset }}</span>
          </div>
        }
      </div>
    }
  `,
})
export class MotionExample {
  readonly presets = PRESETS;
  readonly nonce = signal(0);

  replay(): void {
    this.nonce.update((n) => n + 1);
  }
}
