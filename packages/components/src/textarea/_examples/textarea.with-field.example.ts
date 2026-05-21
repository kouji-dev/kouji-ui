import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjField, KjFieldError, KjFieldHelp, KjFieldLabel } from '@kouji-ui/core';
import { KjTextareaComponent } from '../textarea';

/**
 * Field-wrapped example. `KjField` owns label / help / error semantics
 * and the `aria-describedby` chain; the textarea handles its own counter
 * (which composes its id alongside the field's described-by ids).
 */
@Component({
  selector: 'kj-textarea-with-field-example',
  standalone: true,
  imports: [
    KjTextareaComponent,
    ReactiveFormsModule,
    KjField,
    KjFieldLabel,
    KjFieldHelp,
    KjFieldError,
  ],
  styles: [`
    :host { display: block; }
    [kjField] { display: grid; gap: var(--kj-space-xs); max-width: 480px; }
    [kjFieldLabel] {
      font: var(--kj-text-sm)/1.2 var(--kj-font-sans);
      color: var(--kj-fg-default);
    }
    [kjFieldHelp] {
      font: var(--kj-text-xs)/1.2 var(--kj-font-mono, var(--kj-font-sans));
      color: var(--kj-fg-muted);
    }
    [kjFieldError] {
      font: var(--kj-text-xs)/1.2 var(--kj-font-mono, var(--kj-font-sans));
      color: var(--kj-fg-danger);
    }
  `],
  template: `
    <div
      kjField
      [kjRequired]="true"
      [kjInvalid]="bio.touched && bio.invalid"
    >
      <label for="textarea-bio" kjFieldLabel>Bio</label>
      <kj-textarea
        id="textarea-bio"
        [kjRows]="4"
        [kjMaxLength]="200"
        kjShowCounter
        kjPlaceholder="A few lines about you…"
        [formControl]="bio"
        [kjInvalid]="bio.touched && bio.invalid"
      ></kj-textarea>
      <span kjFieldHelp>Plain text. Markdown is not rendered.</span>
      <span kjFieldError>This field is required.</span>
    </div>
  `,
})
export class KjTextareaWithFieldExample {
  readonly bio = new FormControl('', { validators: [Validators.required] });
}
