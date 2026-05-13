import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputOtpComponent } from './input-otp';

/**
 * Auto-submit: `(kjComplete)` fires when all 6 digits are entered.
 * Focus stays on the last cell; the component shows a success message.
 * The widget resets after 2 seconds to allow re-entry.
 */
@Component({
  selector: 'kj-input-otp-autosubmit-example',
  standalone: true,
  imports: [KjInputOtpComponent, FormsModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--kj-space-lg); }
    label { font-size: var(--kj-text-sm); color: var(--kj-fg-default); }
    .success {
      font-size: var(--kj-text-sm);
      color: #22c55e;
      font-family: var(--kj-font-mono);
      min-height: 1.5rem;
    }
    .hint {
      font-size: var(--kj-text-xs);
      color: var(--kj-fg-muted);
      min-height: 1.5rem;
    }
  `],
  template: `
    <label for="input-otp-autosubmit">Enter code to verify</label>
    <kj-input-otp
      id="input-otp-autosubmit"
      [kjLength]="6"
      [kjAutoSubmit]="true"
      kjAriaLabel="Verification code"
      [(ngModel)]="code"
      (kjComplete)="onComplete($event)"
    />
    @if (submitted()) {
      <span class="success" role="status">
        Code {{ submittedCode() }} accepted!
      </span>
    } @else {
      <span class="hint">Fill all 6 digits to auto-submit</span>
    }
  `,
})
export class KjInputOtpAutosubmitExample {
  code = '';
  readonly submitted = signal(false);
  readonly submittedCode = signal('');

  onComplete(value: string): void {
    this.submittedCode.set(value);
    this.submitted.set(true);
    // Reset after 2 seconds so the user can try again.
    setTimeout(() => {
      this.submitted.set(false);
      this.code = '';
    }, 2000);
  }
}
