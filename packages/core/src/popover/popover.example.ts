import { Component } from '@angular/core';
import { KjPopoverTrigger } from './popover-trigger';
import { KjPopoverContent } from './popover-content';
import { KjPopoverTitle } from './popover-title';
import { KjPopoverClose } from './popover-close';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-popover-basic',
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose, KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [
    `
      :host {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-bottom: 10rem;
        background: var(--kj-bg);
        font-family: var(--kj-font);
        min-height: 220px;
      }
      button[kjButton] {
        padding: 0.5rem 1.25rem;
        border: 1px solid var(--kj-border);
        background: transparent;
        color: var(--kj-text);
        cursor: pointer;
        font-family: inherit;
        font-size: 0.875rem;
      }
      button[kjButton]:hover {
        border-color: var(--kj-accent);
        color: var(--kj-accent);
      }
      kj-popover-content {
        display: block;
        z-index: 20;
        background: var(--kj-surface);
        border: 1px solid var(--kj-border);
        padding: 1rem;
        min-width: 14rem;
        color: var(--kj-text);
      }
      .popover-title {
        font-size: 0.875rem;
        font-weight: 600;
        margin: 0 0 0.5rem;
        color: var(--kj-accent);
      }
      .popover-body {
        font-size: 0.8125rem;
        color: var(--kj-text-muted);
        margin: 0 0 1rem;
        line-height: 1.5;
      }
      .popover-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      .popover-footer button[kjButton] {
        padding: 0.35rem 0.875rem;
        font-size: 0.8125rem;
      }
      [data-variant='default'] {
        border-color: var(--kj-accent);
        color: var(--kj-accent-on);
        background: var(--kj-accent);
      }
      [data-variant='ghost'] {
        border-color: transparent;
        background: transparent;
        color: var(--kj-text-muted);
      }
    `,
  ],
  template: `
    <button kjButton kjPopoverTrigger #t="kjPopoverTrigger">Open Popover</button>
    <kj-popover-content [kjFor]="t">
      <h3 kjPopoverTitle class="popover-title">Notification Settings</h3>
      <p class="popover-body">Control how and when you receive notifications from this app.</p>
      <div class="popover-footer">
        <button kjButton kjPopoverClose [kjVariant]="'ghost'">Cancel</button>
        <button kjButton kjPopoverClose [kjVariant]="'default'">Save</button>
      </div>
    </kj-popover-content>
  `,
})
export class PopoverBasicExample {}
