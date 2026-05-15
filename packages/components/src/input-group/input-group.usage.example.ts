import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputComponent } from '../input/input';
import { KjButtonComponent } from '../button/button';
import { KjInputGroupAddonComponent, KjInputGroupComponent } from './input-group';

/**
 * Common input-group shapes — currency prefix, URL base, and an inline
 * action button. Copy-paste starting point.
 */
@Component({
  selector: 'kj-input-group-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjInputGroupComponent,
    KjInputGroupAddonComponent,
    KjInputComponent,
    KjButtonComponent,
    FormsModule,
  ],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); max-width: 480px; }
  `],
  template: `
    <kj-input-group>
      <kj-input-group-addon [kjAriaHidden]="true">$</kj-input-group-addon>
      <kj-input type="text" placeholder="Amount" [(ngModel)]="amount" aria-label="Amount in dollars" />
      <kj-input-group-addon [kjAriaHidden]="true">USD</kj-input-group-addon>
    </kj-input-group>

    <kj-input-group>
      <kj-input-group-addon [kjAriaHidden]="true">kouji.dev/</kj-input-group-addon>
      <kj-input type="text" placeholder="your-slug" aria-label="URL slug" />
    </kj-input-group>

    <kj-input-group>
      <kj-input type="text" placeholder="API key" aria-label="API key" />
      <kj-input-group-addon>
        <kj-button kjSize="sm" kjVariant="ghost">Copy</kj-button>
      </kj-input-group-addon>
    </kj-input-group>
  `,
})
export class KjInputGroupUsageExample {
  readonly amount = signal('');
}
