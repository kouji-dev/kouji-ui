import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  KjSpeedDialActionComponent,
  KjSpeedDialActionsComponent,
  KjSpeedDialComponent,
  KjSpeedDialTriggerComponent,
} from '../speed-dial';

/**
 * Default Speed Dial — bottom-right viewport anchor, three actions fanning
 * upward. Click the FAB to expand; click an action or press Escape to close.
 *
 * The example uses `kjPosition="static"` inside the docs so the dial sits
 * inside the example pane rather than floating in the global viewport.
 */
@Component({
  selector: 'kj-speed-dial-example',
  standalone: true,
  imports: [
    KjSpeedDialComponent,
    KjSpeedDialTriggerComponent,
    KjSpeedDialActionsComponent,
    KjSpeedDialActionComponent,
  ],
  styles: [
    `
      :host {
        display: flex;
        justify-content: flex-end;
        align-items: flex-end;
        padding: var(--kj-space-2xl);
        min-height: 18rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-speed-dial kjDirection="up" kjPosition="static">
      <kj-speed-dial-trigger kjAriaLabel="Open quick actions">+</kj-speed-dial-trigger>
      <kj-speed-dial-actions>
        <kj-speed-dial-action kjAriaLabel="Edit">E</kj-speed-dial-action>
        <kj-speed-dial-action kjAriaLabel="Share">S</kj-speed-dial-action>
        <kj-speed-dial-action kjAriaLabel="Delete" kjVariant="destructive">D</kj-speed-dial-action>
      </kj-speed-dial-actions>
    </kj-speed-dial>
  `,
})
export class KjSpeedDialExample {}
