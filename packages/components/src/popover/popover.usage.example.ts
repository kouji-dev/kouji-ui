import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';

/**
 * A walkthrough of the most common popover usages — a default info panel, a
 * side-pinned variant, and a modal confirmation. Use this as the copy-paste
 * starting point for inline contextual UI.
 */
@Component({
  selector: 'kj-popover-usage-example',
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose, KjButtonComponent],
  styles: [
    `
      :host {
        display: flex;
        gap: var(--kj-space-md);
        flex-wrap: wrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjPopoverTrigger #info="kjPopoverTrigger">Settings</kj-button>
    <kj-popover-content [kjFor]="info">
      <h3 kjPopoverTitle>Notification settings</h3>
      <p>Control how and when you receive notifications.</p>
      <kj-button kjPopoverClose>Done</kj-button>
    </kj-popover-content>

    <kj-button kjPopoverTrigger #right="kjPopoverTrigger" kjVariant="ghost">Help</kj-button>
    <kj-popover-content [kjFor]="right" kjSide="right">
      <h3 kjPopoverTitle>Quick tip</h3>
      <p>Use ⌘K to open the command palette.</p>
    </kj-popover-content>

    <kj-button kjPopoverTrigger #danger="kjPopoverTrigger" kjVariant="destructive"
      >Delete</kj-button
    >
    <kj-popover-content [kjFor]="danger" [kjTrap]="true">
      <h3 kjPopoverTitle>Delete this item?</h3>
      <p>This action cannot be undone.</p>
      <kj-button kjPopoverClose kjVariant="destructive">Delete</kj-button>
    </kj-popover-content>
  `,
})
export class KjPopoverUsageExample {}
