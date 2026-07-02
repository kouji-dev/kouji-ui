import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjCheckboxComponent } from '../checkbox';

/**
 * A walkthrough of the most common checkbox usages — basic checked binding,
 * indeterminate "parent" state, size variants, and disabled. Use this as the
 * copy-paste starting point for forms.
 */
@Component({
  selector: 'kj-checkbox-usage-example',
  standalone: true,
  imports: [KjCheckboxComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-md);
      }
      .row {
        display: flex;
        gap: var(--kj-space-md);
        flex-wrap: wrap;
        align-items: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="row">
      <kj-checkbox [(checked)]="terms">Accept terms</kj-checkbox>
      <kj-checkbox [(checked)]="newsletter">Subscribe to newsletter</kj-checkbox>
    </div>

    <div class="row">
      <kj-checkbox [(checked)]="all" [indeterminate]="someSelected()">Select all</kj-checkbox>
    </div>

    <div class="row">
      <kj-checkbox size="sm" [(checked)]="small">Small</kj-checkbox>
      <kj-checkbox size="md" [(checked)]="medium">Medium</kj-checkbox>
      <kj-checkbox size="lg" [(checked)]="large">Large</kj-checkbox>
    </div>

    <div class="row">
      <kj-checkbox [disabled]="true">Disabled (unchecked)</kj-checkbox>
      <kj-checkbox [disabled]="true" [checked]="true">Disabled (checked)</kj-checkbox>
    </div>
  `,
})
export class KjCheckboxUsageExample {
  readonly terms = signal(true);
  readonly newsletter = signal(false);
  readonly all = signal(false);
  readonly small = signal(false);
  readonly medium = signal(true);
  readonly large = signal(false);

  someSelected(): boolean {
    return !this.all() && this.newsletter();
  }
}
