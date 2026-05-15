import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputOtpComponent } from './input-otp';

/**
 * 6-digit OTP with a visual separator after cell index 2, rendering as
 * `123–456`. The separator is purely decorative — the form value is always
 * the plain concatenated string (e.g. `"123456"`).
 */
@Component({
  selector: 'kj-input-otp-separator-example',
  standalone: true,
  imports: [KjInputOtpComponent, FormsModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--kj-space-lg); }
    label { font-size: var(--kj-text-sm); color: var(--kj-fg-default); }
    .value {
      font-family: var(--kj-font-mono);
      font-size: var(--kj-text-sm);
      color: var(--kj-fg-muted);
      letter-spacing: 0.1em;
    }
  `],
  template: `
    <label for="input-otp-separator">Verification code</label>
    <kj-input-otp
      id="input-otp-separator"
      [kjLength]="6"
      [kjSeparatorAfter]="[2]"
      kjAriaLabel="Verification code"
      [(ngModel)]="code"
    />
    <span class="value">Value: {{ code || '——' }}</span>
  `,
})
export class KjInputOtpSeparatorExample {
  code = '';
}
