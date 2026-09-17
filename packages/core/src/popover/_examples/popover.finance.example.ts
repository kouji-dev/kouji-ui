import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjPopoverTrigger } from '../popover-trigger';
import { KjPopoverContent } from '../popover-content';
import { KjPopoverTitle } from '../popover-title';
import { KjPopoverClose } from '../popover-close';

@Component({
  selector: 'kj-example-popover-finance',
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose],
  styleUrls: ['../../styles/docs-themes.css'],
  host: { class: 'kj-theme-finance' },
  styles: [
    `
      :host {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 3rem 2rem 10rem;
        background: var(--docs-bg);
        font-family: var(--docs-font);
        min-height: 220px;
      }
      button {
        padding: 0.4rem 1rem;
        background: var(--docs-accent);
        color: var(--docs-accent-on);
        border: 1px solid var(--docs-accent);
        border-radius: var(--docs-radius-md);
        cursor: pointer;
        font-family: inherit;
        font-size: 0.875rem;
        font-weight: 500;
      }
      button:hover {
        background: #2563eb;
      }
      kj-popover-content {
        display: block;
        z-index: 20;
        background: var(--docs-surface);
        border: 1px solid var(--docs-border);
        border-radius: var(--docs-radius-lg);
        box-shadow: var(--docs-shadow-md);
        padding: 1rem;
        min-width: 14rem;
      }
      .popover-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--docs-text);
        margin: 0 0 0.375rem;
      }
      .popover-body {
        font-size: 0.8125rem;
        color: var(--docs-text-muted);
        margin: 0 0 1rem;
        line-height: 1.5;
      }
      .popover-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      .btn-cancel {
        padding: 0.35rem 0.875rem;
        background: var(--docs-surface);
        color: #374151;
        border: 1px solid var(--docs-border);
        border-radius: var(--docs-radius-sm);
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 500;
      }
      .btn-cancel:hover {
        background: #f3f4f6;
      }
      .btn-primary {
        padding: 0.35rem 0.875rem;
        background: var(--docs-accent);
        color: var(--docs-accent-on);
        border: 1px solid var(--docs-accent);
        border-radius: var(--docs-radius-sm);
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 500;
      }
      .btn-primary:hover {
        background: #2563eb;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button kjPopoverTrigger #t="kjPopoverTrigger">Preferences</button>
    <kj-popover-content [kjFor]="t">
      <h3 kjPopoverTitle class="popover-title">Notification Preferences</h3>
      <p class="popover-body">Choose how you receive alerts and account notifications.</p>
      <div class="popover-footer">
        <button class="btn-cancel" kjPopoverClose>Cancel</button>
        <button class="btn-primary" kjPopoverClose>Apply</button>
      </div>
    </kj-popover-content>
  `,
})
export class PopoverFinanceExample {}
