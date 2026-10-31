import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjStat } from '../stat';

@Component({
  selector: 'kj-stat-example',
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
    <kj-stat
      label="Revenue"
      value="$48,200"
      change="+12%"
      direction="up"
      tone="success"
      changeLabel="Up 12% on last month"
    />
    <kj-stat label="Error rate" value="2.4%" change="+0.8 pts" direction="up" tone="error" />
    <kj-stat label="Latency p95" value="310 ms" change="-40 ms" direction="down" tone="info" />
    <kj-stat label="Queue" value="1,204" change="unchanged" />
    <kj-stat label="Tokens" value="9.1k" size="sm" />
  `,
})
export class KjStatExample {}
