import { Component, signal } from '@angular/core';
import { KjToggleComponent } from './toggle';

/**
 * A walkthrough of the most common toggle usages — two-way `[(pressed)]`,
 * disabled, a labelled toggle, and the switch appearance. Use this as the
 * copy-paste starting point for new screens.
 */
@Component({
  selector: 'kj-toggle-usage-example',
  standalone: true,
  imports: [KjToggleComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
    .row { display: flex; gap: var(--kj-space-md); align-items: center; flex-wrap: wrap; }
    .label { font: 0.875rem var(--kj-font-sans); color: var(--kj-fg-default); }
  `],
  template: `
    <div class="row">
      <kj-toggle [(pressed)]="bold" ariaLabel="Bold">B</kj-toggle>
      <kj-toggle [(pressed)]="italic" ariaLabel="Italic">I</kj-toggle>
      <kj-toggle [disabled]="true" ariaLabel="Strikethrough">S</kj-toggle>
    </div>

    <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
    <label class="row">
      <kj-toggle [(pressed)]="notifications" appearance="switch" ariaLabel="Notifications" />
      <span class="label">{{ notifications() ? 'Notifications on' : 'Notifications off' }}</span>
    </label>
  `,
})
export class KjToggleUsageExample {
  readonly bold = signal(true);
  readonly italic = signal(false);
  readonly notifications = signal(true);
}
