import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjPasswordInputComponent } from '../password-input';

/**
 * Strength meter example. `kjShowStrength` enables the four-segment bar; the
 * built-in heuristic scorer drives it. Use `[kjStrengthScorer]` on the
 * directive (core API) to swap in `zxcvbn` or a server-side checker.
 */
@Component({
  selector: 'kj-password-input-strength-example',
  standalone: true,
  imports: [KjPasswordInputComponent],
  styles: [
    `
      :host {
        display: block;
      }
      .row {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-sm);
        max-width: 360px;
      }
      label {
        font-size: var(--kj-text-xs);
        color: var(--kj-fg-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="row">
      <label for="signup-pw">Choose a password</label>
      <kj-password-input
        kjAutocomplete="new-password"
        kjPlaceholder="Mix letters, numbers, symbols"
        [kjShowStrength]="true"
        [(kjValue)]="value"
      />
    </div>
  `,
})
export class KjPasswordInputStrengthExample {
  readonly value = signal('');
}
