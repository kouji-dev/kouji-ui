import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputOtpComponent } from './input-otp';

/**
 * Side-by-side comparison of 4-digit, 6-digit, and 8-digit OTP inputs.
 */
@Component({
  selector: 'kj-input-otp-lengths-example',
  standalone: true,
  imports: [KjInputOtpComponent, FormsModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--kj-space-xl); }
    .row { display: flex; flex-direction: column; gap: var(--kj-space-sm); }
    label { font-size: var(--kj-text-xs); color: var(--kj-fg-muted); font-family: var(--kj-font-mono); }
  `],
  template: `
    <div class="row">
      <label for="input-otp-pin4">4-digit PIN</label>
      <kj-input-otp id="input-otp-pin4" [kjLength]="4" kjAriaLabel="4-digit PIN" [(ngModel)]="pin4" />
    </div>
    <div class="row">
      <label for="input-otp-otp6">6-digit OTP (standard)</label>
      <kj-input-otp id="input-otp-otp6" [kjLength]="6" kjAriaLabel="6-digit code" [(ngModel)]="otp6" />
    </div>
    <div class="row">
      <label for="input-otp-code8">8-digit backup code</label>
      <kj-input-otp id="input-otp-code8" [kjLength]="8" kjAriaLabel="8-digit backup code" [(ngModel)]="code8" />
    </div>
  `,
})
export class KjInputOtpLengthsExample {
  pin4 = '';
  otp6 = '';
  code8 = '';
}
