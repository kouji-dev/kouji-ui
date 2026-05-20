import { Component } from '@angular/core';
import {
  KjSpeedDialActionComponent,
  KjSpeedDialActionsComponent,
  KjSpeedDialComponent,
  KjSpeedDialTriggerComponent,
} from '../speed-dial';

/**
 * Disabled state — the entire dial does not open.
 *
 * Demonstrates two variants side by side: a fully disabled dial (`kjDisabled`
 * on the root) and a dial with a single disabled action. Both rely on
 * `aria-disabled` rather than the native `disabled` attribute so the buttons
 * remain focusable for AT discoverability (kouji's WCAG AAA stance).
 */
@Component({
  selector: 'kj-speed-dial-disabled-example',
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
      padding: var(--kj-space-2xl); min-height: 18rem;
    }
    .kj-speed-dial-disabled__cell {
      display: flex;
      align-items: center;
      justify-content: center; border-radius: var(--kj-radius-box);
    }
  `],
  template: `
    <div class="kj-speed-dial-disabled__cell">
      <kj-speed-dial [kjDisabled]="true" kjPosition="static">
        <kj-speed-dial-trigger kjAriaLabel="Open (disabled)" [kjDisabled]="true">+</kj-speed-dial-trigger>
        <kj-speed-dial-actions>
          <kj-speed-dial-action kjAriaLabel="A">A</kj-speed-dial-action>
          <kj-speed-dial-action kjAriaLabel="B">B</kj-speed-dial-action>
        </kj-speed-dial-actions>
      </kj-speed-dial>
    </div>

    <div class="kj-speed-dial-disabled__cell">
      <kj-speed-dial kjPosition="static">
        <kj-speed-dial-trigger kjAriaLabel="Open">+</kj-speed-dial-trigger>
        <kj-speed-dial-actions>
          <kj-speed-dial-action kjAriaLabel="Edit">E</kj-speed-dial-action>
          <kj-speed-dial-action kjAriaLabel="Archive (disabled)" [kjDisabled]="true">A</kj-speed-dial-action>
          <kj-speed-dial-action kjAriaLabel="Share">S</kj-speed-dial-action>
        </kj-speed-dial-actions>
      </kj-speed-dial>
    </div>
  `,
})
export class KjSpeedDialDisabledExample {}
