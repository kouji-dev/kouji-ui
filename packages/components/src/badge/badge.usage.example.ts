import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjBadgeComponent } from './badge';

/**
 * Common badge shapes — status pill, count, outline. Use this as the
 * copy-paste starting point for new screens.
 */
@Component({
  selector: 'kj-badge-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjBadgeComponent],
  styles: [`:host { display: flex; gap: var(--kj-space-sm); flex-wrap: wrap; align-items: center; }`],
  template: `
    <kj-badge variant="default">New</kj-badge>
    <kj-badge variant="secondary">Beta</kj-badge>
    <kj-badge variant="destructive">Deprecated</kj-badge>
    <kj-badge variant="outline">v2.0</kj-badge>
    <kj-badge size="sm" variant="destructive">12</kj-badge>
  `,
})
export class KjBadgeUsageExample {}
