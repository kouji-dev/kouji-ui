import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjPasswordInputComponent } from './password-input';

/**
 * A walkthrough of the most common password-input usages — a sign-in field,
 * a sign-up field with the strength meter and Caps Lock warning, and a
 * disabled state. Use this as the copy-paste starting point for auth forms.
 */
@Component({
  selector: 'kj-password-input-usage-example',
  standalone: true,
  imports: [KjPasswordInputComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-lg);
        max-width: 22rem;
      }
      label {
        display: grid;
        gap: var(--kj-space-xs);
        font-size: 0.875rem;
        color: var(--kj-fg-default);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
    <label>
      Current password
      <kj-password-input kjAutocomplete="current-password" kjPlaceholder="Enter your password" />
    </label>

    <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
    <label>
      New password
      <kj-password-input
        kjAutocomplete="new-password"
        kjPlaceholder="Choose a strong one"
        [kjShowStrength]="true"
        [kjShowCapsLockWarning]="true"
      />
    </label>

    <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
    <label>
      Read-only (disabled)
      <kj-password-input [kjDisabled]="true" kjPlaceholder="Locked" />
    </label>
  `,
})
export class KjPasswordInputUsageExample {}
