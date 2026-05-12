import { Component, signal } from '@angular/core';
import {
  KjCascadeSelectComponent,
  KjCascadeOptionComponent,
  KjCascadeSubPanelComponent,
} from './cascade-select';

/**
 * Demonstrates per-option `kjDisabled` and a whole-cascade `[disabled]` state.
 * Disabled options are visible but non-interactive (ARIA-disabled, not native).
 */
@Component({
  selector: 'kj-cascade-select-disabled-example',
  standalone: true,
  imports: [KjCascadeSelectComponent, KjCascadeOptionComponent, KjCascadeSubPanelComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 20rem;">
      <div>
        <p style="margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500;">
          Per-option disabled (Antarctica is disabled)
        </p>
        <kj-cascade-select [(kjValue)]="continent" placeholder="Select a continent">
          <kj-cascade-option [kjValue]="'af'" kjLabel="Africa">
            <kj-cascade-sub-panel kjOwnerOptionId="dis-af">
              <kj-cascade-option [kjValue]="'eg'" kjLabel="Egypt" />
              <kj-cascade-option [kjValue]="'ng'" kjLabel="Nigeria" />
            </kj-cascade-sub-panel>
          </kj-cascade-option>
          <kj-cascade-option [kjValue]="'eu'" kjLabel="Europe">
            <kj-cascade-sub-panel kjOwnerOptionId="dis-eu">
              <kj-cascade-option [kjValue]="'fr'" kjLabel="France" />
              <kj-cascade-option [kjValue]="'de'" kjLabel="Germany" />
            </kj-cascade-sub-panel>
          </kj-cascade-option>
          <kj-cascade-option [kjValue]="'an'" kjLabel="Antarctica" kjDisabled />
        </kj-cascade-select>
        <p style="margin-top: 0.5rem; font-size: 0.75rem;">
          Continent: <strong>{{ continent() ?? '—' }}</strong>
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid var(--kj-color-base-300);" />

      <div>
        <p style="margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500;">
          Whole cascade disabled
        </p>
        <kj-cascade-select
          [(kjValue)]="disabledValue"
          placeholder="Disabled cascade"
          [disabled]="true"
        >
          <kj-cascade-option [kjValue]="'us'" kjLabel="USA">
            <kj-cascade-sub-panel kjOwnerOptionId="dis-all-us">
              <kj-cascade-option [kjValue]="'sf'" kjLabel="San Francisco" />
            </kj-cascade-sub-panel>
          </kj-cascade-option>
        </kj-cascade-select>
      </div>
    </div>
  `,
})
export class KjCascadeSelectDisabledExample {
  readonly continent = signal<string | undefined>(undefined);
  readonly disabledValue = signal<string | undefined>(undefined);
}
