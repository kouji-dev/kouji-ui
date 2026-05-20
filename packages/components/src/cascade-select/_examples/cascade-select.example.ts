import { Component, signal } from '@angular/core';
import {
  KjCascadeSelectComponent,
  KjCascadeOptionComponent,
  KjCascadeSubPanelComponent,
} from '../cascade-select';

/**
 * Default cascade-select example: Country → State → City (3 levels).
 * Selecting a city value commits it via `[(kjValue)]`.
 *
 * `<kj-cascade-sub-panel>` automatically binds to its parent
 * `<kj-cascade-option>` — no `kjOwnerOptionId` needed.
 */
@Component({
  selector: 'kj-cascade-select-example',
  standalone: true,
  imports: [KjCascadeSelectComponent, KjCascadeOptionComponent, KjCascadeSubPanelComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-cascade-select [(kjValue)]="selectedCity" placeholder="Select a city">
      <kj-cascade-option [kjValue]="'us'" kjLabel="USA">
        <kj-cascade-sub-panel>
          <kj-cascade-option [kjValue]="'ca'" kjLabel="California">
            <kj-cascade-sub-panel>
              <kj-cascade-option [kjValue]="'sf'" kjLabel="San Francisco" />
              <kj-cascade-option [kjValue]="'la'" kjLabel="Los Angeles" />
              <kj-cascade-option [kjValue]="'sd'" kjLabel="San Diego" />
            </kj-cascade-sub-panel>
          </kj-cascade-option>
          <kj-cascade-option [kjValue]="'ny'" kjLabel="New York">
            <kj-cascade-sub-panel>
              <kj-cascade-option [kjValue]="'nyc'" kjLabel="New York City" />
              <kj-cascade-option [kjValue]="'buf'" kjLabel="Buffalo" />
            </kj-cascade-sub-panel>
          </kj-cascade-option>
        </kj-cascade-sub-panel>
      </kj-cascade-option>

      <kj-cascade-option [kjValue]="'gb'" kjLabel="United Kingdom">
        <kj-cascade-sub-panel>
          <kj-cascade-option [kjValue]="'eng'" kjLabel="England">
            <kj-cascade-sub-panel>
              <kj-cascade-option [kjValue]="'lon'" kjLabel="London" />
              <kj-cascade-option [kjValue]="'man'" kjLabel="Manchester" />
            </kj-cascade-sub-panel>
          </kj-cascade-option>
          <kj-cascade-option [kjValue]="'sco'" kjLabel="Scotland">
            <kj-cascade-sub-panel>
              <kj-cascade-option [kjValue]="'edi'" kjLabel="Edinburgh" />
              <kj-cascade-option [kjValue]="'gla'" kjLabel="Glasgow" />
            </kj-cascade-sub-panel>
          </kj-cascade-option>
        </kj-cascade-sub-panel>
      </kj-cascade-option>

      <kj-cascade-option [kjValue]="'jp'" kjLabel="Japan">
        <kj-cascade-sub-panel>
          <kj-cascade-option [kjValue]="'tok'" kjLabel="Tokyo" />
          <kj-cascade-option [kjValue]="'osa'" kjLabel="Osaka" />
          <kj-cascade-option [kjValue]="'kyo'" kjLabel="Kyoto" />
        </kj-cascade-sub-panel>
      </kj-cascade-option>
    </kj-cascade-select>

    <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--kj-fg-default);">
      Selected: <strong>{{ selectedCity() ?? '—' }}</strong>
    </p>
  `,
})
export class KjCascadeSelectExample {
  readonly selectedCity = signal<string | undefined>(undefined);
}
