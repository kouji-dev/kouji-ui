import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjButtonComponent } from '../button/button';
import { KjFieldComponent, KjFieldLabelComponent } from '../field/field';
import { KjInputComponent } from '../input/input';
import { KjFormActionsComponent, KjFormComponent } from './form';

/**
 * Async submit example — the handler returns a Promise, so `<form kj-form>`
 * reflects `aria-busy` / `data-submitting` for the lifetime of the work.
 * `kjResetOnSuccess` clears the form after the simulated request.
 */
@Component({
  selector: 'kj-form-async-submit-example',
  standalone: true,
  imports: [
    KjFormComponent,
    KjFormActionsComponent,
    KjFieldComponent,
    KjFieldLabelComponent,
    KjInputComponent,
    KjButtonComponent,
    ReactiveFormsModule,
  ],
  styles: [
    `
      :host {
        display: block;
      }
      .status {
        font-size: 0.8125rem;
        opacity: 0.7;
        margin-top: 0.5rem;
      }
    `,
  ],
  template: `
    <form kj-form [formGroup]="form" [kjAsyncSubmit]="submitHandler" kjResetOnSuccess>
      <kj-field>
        <kj-field-label>Title</kj-field-label>
        <kj-input type="text" formControlName="title" />
      </kj-field>
      <kj-field>
        <kj-field-label>Body</kj-field-label>
        <kj-input type="text" formControlName="body" />
      </kj-field>

      <kj-form-actions>
        <kj-button kjType="submit" [kjLoading]="busy()">Publish</kj-button>
      </kj-form-actions>
    </form>

    <p class="status">Last status: {{ status() }}</p>
  `,
})
export class KjFormAsyncSubmitExample {
  readonly form = new FormGroup({
    title: new FormControl('', [Validators.required]),
    body: new FormControl('', [Validators.required]),
  });
  readonly busy = signal(false);
  readonly status = signal('idle');

  readonly submitHandler = async (value: unknown): Promise<void> => {
    this.busy.set(true);
    this.status.set('publishing…');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    this.status.set(`published ${JSON.stringify(value)}`);
    this.busy.set(false);
  };
}
