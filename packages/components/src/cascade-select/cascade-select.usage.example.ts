import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjCascadeOptionComponent,
  KjCascadeSelectComponent,
  KjCascadeSubPanelComponent,
} from './cascade-select';

/**
 * Common cascade-select shape — controlled leaf value plus a path listener.
 * Use this as the copy-paste starting point for new screens.
 */
@Component({
  selector: 'kj-cascade-select-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjCascadeSelectComponent,
    KjCascadeOptionComponent,
    KjCascadeSubPanelComponent,
  ],
  styles: [`:host { display: flex; flex-direction: column; gap: var(--kj-space-md); align-items: flex-start; }`],
  template: `
    <kj-cascade-select [(kjValue)]="city" placeholder="Pick a city">
      <kj-cascade-option [kjValue]="'fr'" kjLabel="France">
        <kj-cascade-sub-panel>
          <kj-cascade-option [kjValue]="'paris'" kjLabel="Paris" />
          <kj-cascade-option [kjValue]="'lyon'" kjLabel="Lyon" />
        </kj-cascade-sub-panel>
      </kj-cascade-option>
      <kj-cascade-option [kjValue]="'jp'" kjLabel="Japan">
        <kj-cascade-sub-panel>
          <kj-cascade-option [kjValue]="'tok'" kjLabel="Tokyo" />
          <kj-cascade-option [kjValue]="'osa'" kjLabel="Osaka" />
        </kj-cascade-sub-panel>
      </kj-cascade-option>
    </kj-cascade-select>
    <p style="font-size: 0.875rem; color: var(--kj-fg-muted);">
      Selected: <strong>{{ city() ?? '—' }}</strong>
    </p>
  `,
})
export class KjCascadeSelectUsageExample {
  readonly city = signal<string | undefined>(undefined);
}
