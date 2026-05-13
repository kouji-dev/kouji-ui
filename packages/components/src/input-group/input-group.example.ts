import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputComponent } from '../input/input';
import { KjInputGroupComponent, KjInputGroupAddonComponent } from './input-group';

/**
 * Default usage: currency prefix and decimal suffix flanking a text input.
 */
@Component({
  selector: 'kj-input-group-example',
  standalone: true,
  imports: [KjInputGroupComponent, KjInputGroupAddonComponent, KjInputComponent, FormsModule],
  styles: [`:host { display: block; }`],
  template: `
    <kj-input-group>
      <kj-input-group-addon [kjAriaHidden]="true">$</kj-input-group-addon>
      <kj-input type="text" placeholder="Amount" [(ngModel)]="amount" aria-label="Amount in dollars" />
      <kj-input-group-addon [kjAriaHidden]="true">.00</kj-input-group-addon>
    </kj-input-group>
    <p style="margin-top:0.75rem;font-size:0.8rem;color:var(--kj-fg-muted)">Value: {{ amount() || '—' }}</p>
  `,
})
export class KjInputGroupExample {
  readonly amount = signal('');
}
