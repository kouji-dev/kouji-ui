import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjPopoverTrigger } from '../popover-trigger';
import { KjPopoverContent } from '../popover-content';
import { KjPopoverTitle } from '../popover-title';
import { KjPopoverClose } from '../popover-close';

@Component({
  selector: 'kj-example-popover-retro',
  standalone: true,
  imports: [KjPopoverTrigger, KjPopoverContent, KjPopoverTitle, KjPopoverClose],
  styleUrls: ['../../styles/docs-themes.css'],
  host: { class: 'kj-theme-retro' },
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
        color: var(--docs-text);
      }
      button {
        padding: 0.4rem 1rem;
        font-family: var(--docs-font);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        background: var(--docs-surface);
        color: var(--docs-text);
        border: var(--docs-btn-border);
        border-radius: 0;
        cursor: pointer;
        box-shadow: var(--docs-shadow-sm);
        transition: var(--docs-transition);
      }
      button:hover {
        transform: translate(-1px, -1px);
        box-shadow: var(--docs-shadow-md);
      }
      kj-popover-content {
        display: block;
        z-index: 20;
        background: var(--docs-bg);
        border: var(--docs-btn-border);
        box-shadow: var(--docs-shadow-hard);
        padding: 1rem;
        min-width: 14rem;
        font-family: var(--docs-font);
      }
      .popover-title {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 0 0 0.5rem;
        border-bottom: var(--docs-btn-border);
        padding-bottom: 0.375rem;
        color: var(--docs-text);
      }
      .popover-body {
        font-size: 0.75rem;
        color: var(--docs-text-muted);
        margin: 0.5rem 0 1rem;
        line-height: 1.6;
      }
      .popover-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      .popover-footer button {
        padding: 0.3rem 0.75rem;
        font-size: 0.7rem;
        box-shadow: var(--docs-shadow-sm);
      }
      .popover-footer button:hover {
        box-shadow: var(--docs-shadow-md);
      }
      .btn-primary {
        background: var(--docs-accent);
        color: var(--docs-accent-on);
        border-color: var(--docs-border);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button kjPopoverTrigger #t="kjPopoverTrigger">Settings</button>
    <kj-popover-content [kjFor]="t">
      <h3 kjPopoverTitle class="popover-title">Notifications</h3>
      <p class="popover-body">Configure notification frequency and delivery preferences.</p>
      <div class="popover-footer">
        <button kjPopoverClose>Cancel</button>
        <button kjPopoverClose class="btn-primary">Save</button>
      </div>
    </kj-popover-content>
  `,
})
export class PopoverRetroExample {}
