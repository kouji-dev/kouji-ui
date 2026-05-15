import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjButtonComponent } from '../button/button';
import { KjFieldComponent, KjFieldLabelComponent } from '../field/field';
import { KjInputComponent } from '../input/input';
import {
  KjFormActionsComponent,
  KjFormComponent,
  KjFormSummaryComponent,
} from './form';

/**
 * Common form shape — reactive group, summary, and actions row with a
 * Cancel / Submit pair. Copy-paste starting point for new forms.
 */
@Component({
  selector: 'kj-form-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjFormComponent,
    KjFormActionsComponent,
    KjFormSummaryComponent,
    KjFieldComponent,
    KjFieldLabelComponent,
    KjInputComponent,
    KjButtonComponent,
    ReactiveFormsModule,
  ],
  styles: [`:host { display: block; max-width: 480px; }`],
  template: `
    <form kj-form [formGroup]="form" (kjSubmit)="onSubmit($event)">
      <kj-form-summary />

      <kj-field>
        <kj-field-label>Email</kj-field-label>
        <kj-input type="email" formControlName="email" placeholder="you@example.com" />
      </kj-field>

      <kj-field>
        <kj-field-label>Password</kj-field-label>
        <kj-input type="password" formControlName="password" />
      </kj-field>

      <kj-form-actions>
        <kj-button kjVariant="ghost" kjType="reset">Cancel</kj-button>
        <kj-button kjType="submit" [kjLoading]="busy()">Save</kj-button>
      </kj-form-actions>
    </form>
  `,
})
export class KjFormUsageExample {
  readonly busy = signal(false);
  readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
  });

  onSubmit(_value: unknown): void {
    this.busy.set(true);
    setTimeout(() => this.busy.set(false), 800);
  }
}
