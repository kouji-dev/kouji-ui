import { Component, signal } from '@angular/core';
import { KjButtonComponent } from '../button/button';
import { KjSpinnerComponent } from './spinner';

/**
 * Spinner composed inside a `<kj-button>` for the loading-state pattern.
 * The button toggles a busy signal on click; the spinner appears next to
 * the label and inherits the button's text colour (the `neutral` variant
 * resolves to `currentColor` in shipped themes, so the spinner is
 * automatically the on-primary colour when the button itself is primary).
 */
@Component({
  selector: 'kj-spinner-in-button-example',
  standalone: true,
  imports: [KjButtonComponent, KjSpinnerComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-md); align-items: center; }
  `],
  template: `
    <kj-button (click)="run()" [kjDisabled]="busy()">
      @if (busy()) {
        <kj-spinner kjSize="sm" kjAriaLabel="Saving" />
      }
      {{ busy() ? 'Saving…' : 'Save' }}
    </kj-button>

    <kj-button kjVariant="ghost" (click)="run()" [kjDisabled]="busy()">
      @if (busy()) {
        <kj-spinner kjSize="sm" kjAnimation="dots" kjAriaLabel="Sending" />
      }
      {{ busy() ? 'Sending…' : 'Send' }}
    </kj-button>
  `,
})
export class KjSpinnerInButtonExample {
  readonly busy = signal(false);

  async run() {
    if (this.busy()) return;
    this.busy.set(true);
    await new Promise((r) => setTimeout(r, 1500));
    this.busy.set(false);
  }
}
