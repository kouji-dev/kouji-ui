import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { KjTextareaComponent } from './textarea';

/**
 * Character-counter example. `kjMaxLength` enables native truncation; the
 * visible counter renders below the textarea and an aria-live region
 * announces threshold crossings (≤ 20, ≤ 10, 0 remaining) to AT users.
 */
@Component({
  selector: 'kj-textarea-character-count-example',
  standalone: true,
  imports: [KjTextareaComponent, ReactiveFormsModule],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <kj-textarea
      [kjRows]="4"
      [kjMaxLength]="200"
      kjShowCounter
      kjPlaceholder="Up to 200 characters…"
      [formControl]="bio"
    ></kj-textarea>
  `,
})
export class KjTextareaCharacterCountExample {
  readonly bio = new FormControl('');
}
