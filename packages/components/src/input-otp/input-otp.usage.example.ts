import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputOtpComponent } from './input-otp';

/**
 * Common OTP shapes — default 6-digit, short 4-digit, masked code, and a
 * grouped 6-digit with a visual separator. Copy-paste starting point.
 */
@Component({
  selector: 'kj-input-otp-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjInputOtpComponent, FormsModule],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-lg); }
    .row { display: flex; flex-direction: column; gap: var(--kj-space-xs); }
    label { font: 500 var(--kj-text-sm)/1.4 var(--kj-font-sans); }
    code { font: var(--kj-text-xs)/1 var(--kj-font-mono); color: var(--kj-fg-muted); }
  `],
  template: `
    <div class="row">
      <label for="usage-otp-6">Verification code</label>
      <kj-input-otp id="usage-otp-6" kjAriaLabel="Verification code" [(ngModel)]="code" />
      <code>{{ code || '——' }}</code>
    </div>

    <div class="row">
      <label for="usage-otp-4">Short PIN</label>
      <kj-input-otp id="usage-otp-4" [kjLength]="4" kjAriaLabel="Short PIN" />
    </div>

    <div class="row">
      <label for="usage-otp-masked">Masked code</label>
      <kj-input-otp id="usage-otp-masked" [kjMask]="true" kjAriaLabel="Masked code" />
    </div>

    <div class="row">
      <label for="usage-otp-sep">Grouped code</label>
      <kj-input-otp id="usage-otp-sep" [kjSeparatorAfter]="[2]" kjAriaLabel="Grouped code" />
    </div>
  `,
})
export class KjInputOtpUsageExample {
  code = '';
}
