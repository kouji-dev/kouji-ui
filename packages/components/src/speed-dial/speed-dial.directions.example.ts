import { Component } from '@angular/core';
import {
  KjSpeedDialActionComponent,
  KjSpeedDialActionsComponent,
  KjSpeedDialComponent,
  KjSpeedDialTriggerComponent,
} from './speed-dial';

/**
 * Four dials in the same example, each fanning out in a different direction.
 *
 * `kjDirection` controls the visual axis only — the keyboard contract is the
 * same regardless of direction (Enter/Space to toggle, Escape to close).
 */
@Component({
  selector: 'kj-speed-dial-directions-example',
  standalone: true,
  imports: [
    KjSpeedDialComponent,
    KjSpeedDialTriggerComponent,
    KjSpeedDialActionsComponent,
    KjSpeedDialActionComponent,
  ],
  styles: [`
    :host {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--kj-space-2xl);
      padding: var(--kj-space-2xl);
      background: var(--kj-bg-surface);
      min-height: 22rem;
    }
    .kj-speed-dial-directions__cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--kj-space-xl);
      background: var(--kj-bg-body);
      border-radius: var(--kj-radius-box);
      min-height: 8rem;
    }
  `],
  template: `
    <div class="kj-speed-dial-directions__cell">
      <kj-speed-dial kjDirection="up" kjPosition="static">
        <kj-speed-dial-trigger kjAriaLabel="Open up-direction dial">+</kj-speed-dial-trigger>
        <kj-speed-dial-actions>
          <kj-speed-dial-action kjAriaLabel="A">A</kj-speed-dial-action>
          <kj-speed-dial-action kjAriaLabel="B">B</kj-speed-dial-action>
        </kj-speed-dial-actions>
      </kj-speed-dial>
    </div>

    <div class="kj-speed-dial-directions__cell">
      <kj-speed-dial kjDirection="down" kjPosition="static">
        <kj-speed-dial-trigger kjAriaLabel="Open down-direction dial">+</kj-speed-dial-trigger>
        <kj-speed-dial-actions>
          <kj-speed-dial-action kjAriaLabel="A">A</kj-speed-dial-action>
          <kj-speed-dial-action kjAriaLabel="B">B</kj-speed-dial-action>
        </kj-speed-dial-actions>
      </kj-speed-dial>
    </div>

    <div class="kj-speed-dial-directions__cell">
      <kj-speed-dial kjDirection="left" kjPosition="static">
        <kj-speed-dial-trigger kjAriaLabel="Open left-direction dial">+</kj-speed-dial-trigger>
        <kj-speed-dial-actions>
          <kj-speed-dial-action kjAriaLabel="A">A</kj-speed-dial-action>
          <kj-speed-dial-action kjAriaLabel="B">B</kj-speed-dial-action>
        </kj-speed-dial-actions>
      </kj-speed-dial>
    </div>

    <div class="kj-speed-dial-directions__cell">
      <kj-speed-dial kjDirection="right" kjPosition="static">
        <kj-speed-dial-trigger kjAriaLabel="Open right-direction dial">+</kj-speed-dial-trigger>
        <kj-speed-dial-actions>
          <kj-speed-dial-action kjAriaLabel="A">A</kj-speed-dial-action>
          <kj-speed-dial-action kjAriaLabel="B">B</kj-speed-dial-action>
        </kj-speed-dial-actions>
      </kj-speed-dial>
    </div>
  `,
})
export class KjSpeedDialDirectionsExample {}
