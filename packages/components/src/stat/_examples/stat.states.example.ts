import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjStat } from '../stat';

@Component({
  selector: 'kj-stat-states-example',
  standalone: true,
  imports: [KjStat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: flex;
        gap: var(--kj-space-xl, 2rem);
        flex-wrap: wrap;
      }
    `,
  ],
  template: `
    <kj-stat label="Active users" loading />
    <kj-stat label="Conversions" [value]="null" />
    <kj-stat label="Refunds" [value]="null" emptyText="No data yet" />
  `,
})
export class KjStatStatesExample {}
