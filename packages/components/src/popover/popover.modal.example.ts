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
 * Modal popover. Setting `kjModal=true` on `<kj-popover-content>` engages the
 * focus-trap (Tab cycles inside the panel only) and the `<body>` scroll-lock
 * coordinated by `KjOverlayService`. `aria-modal="true"` is reflected on the
 * panel; Esc closes regardless of `kjCloseOnEsc` (WCAG 2.1.2 No Keyboard Trap).
 */
@Component({
  selector: 'kj-popover-modal-example',
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
    .kj-popover-modal-example__body { margin: 0 0 var(--kj-space-md); color: var(--kj-color-base-content); opacity: 0.85; }
    .kj-popover-modal-example__footer { display: flex; justify-content: flex-end; gap: var(--kj-space-sm); }
  `],
  template: `
    <kj-popover>
      <kj-popover-trigger>
        <kj-button kjVariant="destructive">Delete account</kj-button>
      </kj-popover-trigger>
      <kj-popover-content [kjModal]="true" kjAriaLabel="Confirm delete account">
        <kj-popover-title>Delete account?</kj-popover-title>
        <p class="kj-popover-modal-example__body">
          This action is permanent. Your data will be removed and cannot be
          recovered.
        </p>
        <div class="kj-popover-modal-example__footer">
          <kj-popover-close>
            <kj-button kjVariant="ghost">Cancel</kj-button>
          </kj-popover-close>
          <kj-popover-close>
            <kj-button kjVariant="destructive">Delete</kj-button>
          </kj-popover-close>
        </div>
      </kj-popover-content>
    </kj-popover>
  `,
})
export class KjPopoverModalExample {}
