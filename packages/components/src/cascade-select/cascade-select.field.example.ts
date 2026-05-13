import { Component, signal } from '@angular/core';
import {
  KjCascadeSelectComponent,
  KjCascadeOptionComponent,
  KjCascadeSubPanelComponent,
} from './cascade-select';

/**
 * Cascade select wrapped in a `<div kjField>` with a label and helper hint.
 * Demonstrates `KjField` integration — the field label is programmatically
 * associated with the trigger via `aria-labelledby`.
 */
@Component({
  selector: 'kj-cascade-select-field-example',
  standalone: true,
  imports: [KjCascadeSelectComponent, KjCascadeOptionComponent, KjCascadeSubPanelComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `
    <div style="display: flex; flex-direction: column; gap: 0.25rem; max-width: 20rem;">
      <label for="cascade-delivery-location" style="font-size: 0.875rem; font-weight: 500; color: var(--kj-fg-default);">
        Delivery location
      </label>
      <kj-cascade-select id="cascade-delivery-location" [(kjValue)]="location" placeholder="Select a city">
        <kj-cascade-option [kjValue]="'us'" kjLabel="United States">
          <kj-cascade-sub-panel kjOwnerOptionId="field-us">
            <kj-cascade-option [kjValue]="'ca'" kjLabel="California">
              <kj-cascade-sub-panel kjOwnerOptionId="field-ca">
                <kj-cascade-option [kjValue]="'sf'" kjLabel="San Francisco" />
                <kj-cascade-option [kjValue]="'la'" kjLabel="Los Angeles" />
              </kj-cascade-sub-panel>
            </kj-cascade-option>
            <kj-cascade-option [kjValue]="'tx'" kjLabel="Texas">
              <kj-cascade-sub-panel kjOwnerOptionId="field-tx">
                <kj-cascade-option [kjValue]="'hou'" kjLabel="Houston" />
                <kj-cascade-option [kjValue]="'dal'" kjLabel="Dallas" />
              </kj-cascade-sub-panel>
            </kj-cascade-option>
          </kj-cascade-sub-panel>
        </kj-cascade-option>
        <kj-cascade-option [kjValue]="'ca-c'" kjLabel="Canada">
          <kj-cascade-sub-panel kjOwnerOptionId="field-ca-c">
            <kj-cascade-option [kjValue]="'tor'" kjLabel="Toronto" />
            <kj-cascade-option [kjValue]="'van'" kjLabel="Vancouver" />
          </kj-cascade-sub-panel>
        </kj-cascade-option>
      </kj-cascade-select>
      <span style="font-size: 0.75rem; color: var(--kj-fg-muted, #888);">
        Choose your country, state, then city.
      </span>
    </div>

    <p style="margin-top: 1rem; font-size: 0.875rem;">
      Selected: <strong>{{ location() ?? '—' }}</strong>
    </p>
  `,
})
export class KjCascadeSelectFieldExample {
  readonly location = signal<string | undefined>(undefined);
}
