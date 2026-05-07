import { Component } from '@angular/core';
import {
  KjPopoverComponent,
  KjPopoverTriggerComponent,
  KjPopoverContentComponent,
  KjPopoverTitleComponent,
  KjPopoverCloseComponent,
} from './popover';
import { KjButtonComponent } from '../button/button';

/**
 * Default usage example for KjPopoverComponent.
 *
 * Compound shape — `<kj-popover>` owns the state, `<kj-popover-trigger>`
 * activates it, and `<kj-popover-content>` is the floating panel. The panel
 * is portal-mounted to `document.body` so it escapes any clipping ancestor;
 * `aria-labelledby` is auto-wired to the projected `<kj-popover-title>`.
 */
@Component({
  selector: 'kj-popover-example',
  standalone: true,
  imports: [
    KjPopoverComponent,
    KjPopoverTriggerComponent,
    KjPopoverContentComponent,
    KjPopoverTitleComponent,
    KjPopoverCloseComponent,
    KjButtonComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 12rem; }
    .kj-popover-example__body { margin: 0 0 var(--kj-space-md); color: var(--kj-color-base-content); opacity: 0.85; }
    .kj-popover-example__footer { display: flex; justify-content: flex-end; gap: var(--kj-space-sm); }
  `],
  template: `
    <kj-popover>
      <kj-popover-trigger>
        <kj-button kjVariant="default">Open popover</kj-button>
      </kj-popover-trigger>
      <kj-popover-content kjAriaLabel="Notification settings">
        <kj-popover-title>Notification settings</kj-popover-title>
        <p class="kj-popover-example__body">
          Control how and when you receive notifications from this app.
        </p>
        <div class="kj-popover-example__footer">
          <kj-popover-close>
            <kj-button kjVariant="ghost">Cancel</kj-button>
          </kj-popover-close>
          <kj-popover-close>
            <kj-button kjVariant="default">Save</kj-button>
          </kj-popover-close>
        </div>
      </kj-popover-content>
    </kj-popover>
  `,
})
export class KjPopoverExample {}
