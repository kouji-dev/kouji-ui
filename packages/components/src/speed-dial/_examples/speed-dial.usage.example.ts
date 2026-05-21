import { Component, signal } from '@angular/core';
import {
  KjSpeedDialActionComponent,
  KjSpeedDialActionsComponent,
  KjSpeedDialComponent,
  KjSpeedDialTriggerComponent,
} from '../speed-dial';

/**
 * A walkthrough of the most common speed-dial usages — fan-out direction,
 * destructive accent on a single action, and a click handler that toggles a
 * counter. Use this as the copy-paste starting point.
 */
@Component({
  selector: 'kj-speed-dial-usage-example',
  standalone: true,
  imports: [
    KjSpeedDialComponent,
    KjSpeedDialTriggerComponent,
    KjSpeedDialActionsComponent,
    KjSpeedDialActionComponent,
  ],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); align-items: flex-end; padding: var(--kj-space-2xl); min-height: 16rem; }
    .count { font: 0.875rem var(--kj-font-sans); color: var(--kj-fg-default); }
  `],
  template: `
    <p class="count">Actions invoked: {{ count() }}</p>
    <kj-speed-dial kjDirection="up" kjPosition="static">
      <kj-speed-dial-trigger kjAriaLabel="Open quick actions">+</kj-speed-dial-trigger>
      <kj-speed-dial-actions>
        <kj-speed-dial-action kjAriaLabel="Edit" (click)="bump()">E</kj-speed-dial-action>
        <kj-speed-dial-action kjAriaLabel="Share" (click)="bump()">S</kj-speed-dial-action>
        <kj-speed-dial-action kjAriaLabel="Delete" kjVariant="destructive" (click)="bump()">D</kj-speed-dial-action>
      </kj-speed-dial-actions>
    </kj-speed-dial>
  `,
})
export class KjSpeedDialUsageExample {
  readonly count = signal(0);
  bump(): void {
    this.count.update((c) => c + 1);
  }
}
