import { Component, signal } from '@angular/core';
import {
  KjCascadeSelectComponent,
  KjCascadeOptionComponent,
  KjCascadeSubPanelComponent,
} from './cascade-select';
import type { KjCascadeNode } from '@kouji-ui/core';

interface GeoNode extends KjCascadeNode<string> {
  readonly value: string;
  readonly label: string;
  readonly children?: readonly GeoNode[];
}

const REGIONS: readonly GeoNode[] = [
  {
    value: 'na',
    label: 'North America',
    children: [
      {
        value: 'us',
        label: 'United States',
        children: [
          { value: 'sf', label: 'San Francisco' },
          { value: 'la', label: 'Los Angeles' },
          { value: 'chi', label: 'Chicago' },
          { value: 'nyc', label: 'New York City' },
        ],
      },
      {
        value: 'ca',
        label: 'Canada',
        children: [
          { value: 'tor', label: 'Toronto' },
          { value: 'van', label: 'Vancouver' },
        ],
      },
    ],
  },
  {
    value: 'eu',
    label: 'Europe',
    children: [
      {
        value: 'de',
        label: 'Germany',
        children: [
          { value: 'ber', label: 'Berlin' },
          { value: 'mun', label: 'Munich' },
        ],
      },
      {
        value: 'fr',
        label: 'France',
        children: [
          { value: 'par', label: 'Paris' },
          { value: 'lyo', label: 'Lyon' },
        ],
      },
    ],
  },
  {
    value: 'as',
    label: 'Asia',
    children: [
      { value: 'tok', label: 'Tokyo' },
      { value: 'bei', label: 'Beijing' },
      { value: 'sin', label: 'Singapore' },
    ],
  },
];

/**
 * Data-driven cascade-select example. Hierarchy is built from a data array
 * rather than inline markup. Each node drives `<kj-cascade-option>`
 * bindings including nested sub-panels.
 */
@Component({
  selector: 'kj-cascade-select-data-driven-example',
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
    <kj-cascade-select [(kjValue)]="selected" placeholder="Select a location">
      @for (region of regions; track region.value) {
        <kj-cascade-option [kjValue]="region.value" [kjLabel]="region.label">
          <kj-cascade-sub-panel [kjOwnerOptionId]="region.value">
            @for (country of region.children; track country.value) {
              <kj-cascade-option [kjValue]="country.value" [kjLabel]="country.label">
                @if (country.children?.length) {
                  <kj-cascade-sub-panel [kjOwnerOptionId]="country.value">
                    @for (city of country.children; track city.value) {
                      <kj-cascade-option [kjValue]="city.value" [kjLabel]="city.label" />
                    }
                  </kj-cascade-sub-panel>
                }
              </kj-cascade-option>
            }
          </kj-cascade-sub-panel>
        </kj-cascade-option>
      }
    </kj-cascade-select>

    <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--kj-color-base-content);">
      Selected: <strong>{{ selected() ?? '—' }}</strong>
    </p>
  `,
})
export class KjCascadeSelectDataDrivenExample {
  readonly regions = REGIONS;
  readonly selected = signal<string | undefined>(undefined);
}
