import { Component, computed, signal } from '@angular/core';
import { KjPasswordInputComponent } from './password-input';

/**
 * Validation-rules display example. Renders a checklist of policy rules
 * alongside the password input; each rule flips green when satisfied. The
 * strength meter and Caps Lock warning are both on so the example shows the
 * full sign-up shape.
 */
@Component({
  selector: 'kj-password-input-with-rules-example',
  standalone: true,
  imports: [KjPasswordInputComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }
    .row { display: flex; flex-direction: column; gap: var(--kj-space-sm); max-width: 380px; }
    label { font-size: var(--kj-text-xs); color: var(--kj-fg-muted); }
    .rules { list-style: none; padding: 0; margin: var(--kj-space-xs) 0 0; display: grid; gap: 0.25rem; font-size: var(--kj-text-xs); }
    .rules li { color: var(--kj-fg-muted); }
    .rules li[data-pass="true"] { color: var(--kj-fg-success, #059669); }
    .rules li::before { content: "○ "; }
    .rules li[data-pass="true"]::before { content: "✓ "; }
  `],
  template: `
    <div class="row">
      <label for="signup-pw">Create a password</label>
      <kj-password-input
        kjAutocomplete="new-password"
        kjPlaceholder="At least 8 characters"
        [kjShowStrength]="true"
        [kjShowCapsLockWarning]="true"
        [(kjValue)]="value" />

      <ul class="rules" aria-label="Password requirements">
        <li [attr.data-pass]="hasMinLength()">8+ characters</li>
        <li [attr.data-pass]="hasUpper()">An uppercase letter</li>
        <li [attr.data-pass]="hasNumber()">A number</li>
        <li [attr.data-pass]="hasSymbol()">A symbol</li>
      </ul>
    </div>
  `,
})
export class KjPasswordInputWithRulesExample {
  readonly value = signal('');
  readonly hasMinLength = computed(() => this.value().length >= 8);
  readonly hasUpper = computed(() => /[A-Z]/.test(this.value()));
  readonly hasNumber = computed(() => /\d/.test(this.value()));
  readonly hasSymbol = computed(() => /[^a-zA-Z0-9]/.test(this.value()));
}
