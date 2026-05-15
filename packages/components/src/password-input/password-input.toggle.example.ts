import { Component, signal } from '@angular/core';
import { KjPasswordInputComponent } from './password-input';

/**
 * Show / hide toggle example. The toggle is on by default; the example wires
 * a two-way `[(kjRevealed)]` so the parent component can inspect the state.
 */
@Component({
  selector: 'kj-password-input-toggle-example',
  standalone: true,
  imports: [KjPasswordInputComponent],
  styles: [`
    :host { display: block; }
    .row { display: flex; flex-direction: column; gap: var(--kj-space-sm); max-width: 360px; }
    .state { font-size: var(--kj-text-xs); color: var(--kj-fg-muted); }
  `],
  template: `
    <div class="row">
      <kj-password-input
        kjAutocomplete="current-password"
        kjPlaceholder="Click the eye to reveal"
        [(kjRevealed)]="revealed" />
      <span class="state">revealed: {{ revealed() }}</span>
    </div>
  `,
})
export class KjPasswordInputToggleExample {
  readonly revealed = signal(false);
}
