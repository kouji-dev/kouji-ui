import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputOtpComponent } from './input-otp';

/**
 * Default 6-digit OTP with `[(ngModel)]` two-way binding. Shows current value.
 */
@Component({
  selector: 'kj-input-otp-example',
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
      letter-spacing: 0.15em;
      min-height: 1.25rem;
    }
  `],
  template: `
    <label for="input-otp-default">Verification code</label>
    <kj-input-otp
      id="input-otp-default"
      [kjLength]="6"
      kjAriaLabel="Verification code"
      [(ngModel)]="code"
    />
    <span class="value">Value: {{ code || '——' }}</span>
  `,
})
export class KjInputOtpExample {
  code = '';
}
