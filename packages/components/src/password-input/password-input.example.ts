import { Component } from '@angular/core';
import { KjPasswordInputComponent } from './password-input';

/**
 * Default usage example for KjPasswordInputComponent.
 * Login-form shape: type="password", show/hide toggle, no meter, no Caps Lock warning.
 */
@Component({
  selector: 'kj-password-input-example',
  standalone: true,
  imports: [KjPasswordInputComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <kj-password-input kjAutocomplete="current-password" kjPlaceholder="Enter your password" />
  `,
})
export class KjPasswordInputExample {}
