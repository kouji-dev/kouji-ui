import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputOtpComponent } from './input-otp';

/**
 * Masked PIN entry — cells render as `type="password"` so characters are
 * hidden as the user types. Use for banking PIN re-entry or recovery codes.
 */
@Component({
  selector: 'kj-input-otp-masked-example',
  standalone: true,
  imports: [KjInputOtpComponent, FormsModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--kj-space-lg);
      padding: var(--kj-space-xl);
      background: var(--kj-color-base-200);
    }
    label { font-size: var(--kj-text-sm); color: var(--kj-color-base-content); }
    .hint { font-size: var(--kj-text-xs); color: var(--kj-color-neutral); }
  `],
  template: `
    <label for="input-otp-masked">Enter your PIN</label>
    <kj-input-otp
      id="input-otp-masked"
      [kjLength]="6"
      [kjMask]="true"
      kjAriaLabel="6-digit PIN"
      [(ngModel)]="pin"
    />
    <span class="hint">Characters are hidden as you type</span>
  `,
})
export class KjInputOtpMaskedExample {
  pin = '';
}
