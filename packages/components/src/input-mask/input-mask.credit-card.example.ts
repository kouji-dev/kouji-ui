import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputMask, KJ_INPUT_MASK_PRESETS } from '@kouji-ui/core';
import {
  KjFieldComponent,
  KjFieldLabelComponent,
} from '../field/field';

/**
 * Credit-card form using `KJ_INPUT_MASK_PRESETS`. The `(kjComplete)` event on
 * each field auto-advances focus to the next field — a common UX pattern for
 * payment entry.
 */
@Component({
  selector: 'kj-input-mask-credit-card-example',
  standalone: true,
  imports: [
    FormsModule,
    KjInputMask,
    KjFieldComponent,
    KjFieldLabelComponent,
  ],
  styles: [`
    :host {
      display: block;
      padding: var(--kj-space-xl);
      background: var(--kj-bg-surface);
      max-width: 400px;
    }
    .card-form {
      display: flex;
      flex-direction: column;
      gap: var(--kj-space-md);
    }
    .card-row {
      display: flex;
      gap: var(--kj-space-md);
    }
    .card-row kj-field {
      flex: 1;
    }
    input[kjInputMask] {
      background: var(--kj-bg-field);
      color: var(--kj-fg-default);
      border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-field, 0.375rem);
      padding: var(--kj-space-sm) var(--kj-space-md);
      font: var(--kj-text-sm) / 1.4 var(--kj-font-sans);
      font-variant-numeric: tabular-nums;
      width: 100%;
    }
    input[kjInputMask]:focus-visible {
      outline: 2px solid var(--kj-fg-primary);
      outline-offset: 2px;
      border-color: var(--kj-fg-primary);
    }
  `],
  template: `
    <div class="card-form">
      <kj-field>
        <kj-field-label>Card number</kj-field-label>
        <input
          #cardNumber
          kjInputMask
          [kjMask]="presets.cardNumber"
          [(ngModel)]="cardNumberValue"
          (kjComplete)="expiryInput().nativeElement.focus()"
        />
      </kj-field>
      <div class="card-row">
        <kj-field>
          <kj-field-label>Expiry (MM/YY)</kj-field-label>
          <input
            #expiry
            kjInputMask
            [kjMask]="presets.cardExpiry"
            [(ngModel)]="expiryValue"
            (kjComplete)="cvvInput().nativeElement.focus()"
          />
        </kj-field>
        <kj-field>
          <kj-field-label>CVV</kj-field-label>
          <input
            #cvv
            kjInputMask
            kjMask="999"
            [(ngModel)]="cvvValue"
          />
        </kj-field>
      </div>
    </div>
  `,
})
export class KjInputMaskCreditCardExample {
  readonly presets = KJ_INPUT_MASK_PRESETS;

  readonly cardNumberValue = signal('');
  readonly expiryValue = signal('');
  readonly cvvValue = signal('');

  readonly expiryInput = viewChild.required<ElementRef<HTMLInputElement>>('expiry');
  readonly cvvInput = viewChild.required<ElementRef<HTMLInputElement>>('cvv');
}
