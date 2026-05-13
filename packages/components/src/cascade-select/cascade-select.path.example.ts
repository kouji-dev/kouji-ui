import { Component, signal } from '@angular/core';
import {
  KjCascadeSelectComponent,
  KjCascadeOptionComponent,
  KjCascadeSubPanelComponent,
} from './cascade-select';

const LABELS: Record<string, string> = {
  us: 'USA', gb: 'UK', ca: 'California', ny: 'New York',
  sf: 'San Francisco', la: 'Los Angeles', nyc: 'New York City', lon: 'London',
};

/**
 * Demonstrates `(kjCascadePathChange)` — the full path from root to leaf
 * is emitted on every selection and rendered as a breadcrumb.
 */
@Component({
  selector: 'kj-cascade-select-path-example',
  standalone: true,
  imports: [KjCascadeSelectComponent, KjCascadeOptionComponent, KjCascadeSubPanelComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `
    <div style="margin-bottom: 0.75rem; font-size: 0.875rem; color: var(--kj-fg-default);">
      Path: <span style="font-weight: 600;">{{ breadcrumb() }}</span>
    </div>

    <kj-cascade-select
      [(kjValue)]="selectedCity"
      (kjCascadePathChange)="onPathChange($event)"
      placeholder="Select a city"
    >
      <kj-cascade-option [kjValue]="'us'" kjLabel="USA">
        <kj-cascade-sub-panel kjOwnerOptionId="path-us">
          <kj-cascade-option [kjValue]="'ca'" kjLabel="California">
            <kj-cascade-sub-panel kjOwnerOptionId="path-ca">
              <kj-cascade-option [kjValue]="'sf'" kjLabel="San Francisco" />
              <kj-cascade-option [kjValue]="'la'" kjLabel="Los Angeles" />
            </kj-cascade-sub-panel>
          </kj-cascade-option>
          <kj-cascade-option [kjValue]="'ny'" kjLabel="New York">
            <kj-cascade-sub-panel kjOwnerOptionId="path-ny">
              <kj-cascade-option [kjValue]="'nyc'" kjLabel="New York City" />
            </kj-cascade-sub-panel>
          </kj-cascade-option>
        </kj-cascade-sub-panel>
      </kj-cascade-option>
      <kj-cascade-option [kjValue]="'gb'" kjLabel="United Kingdom">
        <kj-cascade-sub-panel kjOwnerOptionId="path-gb">
          <kj-cascade-option [kjValue]="'lon'" kjLabel="London" />
        </kj-cascade-sub-panel>
      </kj-cascade-option>
    </kj-cascade-select>

    <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--kj-fg-default);">
      Selected value: <strong>{{ selectedCity() ?? '—' }}</strong>
    </p>
  `,
})
export class KjCascadeSelectPathExample {
  readonly selectedCity = signal<string | undefined>(undefined);
  readonly path = signal<readonly unknown[]>([]);

  readonly breadcrumb = () => {
    const p = this.path();
    if (!p.length) return '—';
    return p.map(v => LABELS[v as string] ?? String(v)).join(' › ');
  };

  onPathChange(p: readonly unknown[]): void {
    this.path.set(p);
  }
}
