import { Component } from '@angular/core';
import {
  KjPopover, KjPopoverTrigger,
  KjPopoverContent, KjPopoverClose,
} from './popover';

@Component({
  selector: 'kj-example-popover-finance',
  standalone: true,
  imports: [
    KjPopover, KjPopoverTrigger,
    KjPopoverContent, KjPopoverClose,
  ],
  styleUrls: ['../styles/docs-themes.css'],
  host: { class: 'kj-theme-finance' },
  styles: [`
    :host { display: flex; align-items: flex-start; justify-content: center; padding: 3rem 2rem 10rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 220px; }
    .anchor { position: relative; display: inline-block; }
    button {
      padding: 0.4rem 1rem; background: var(--kj-accent); color: var(--kj-accent-on); border: 1px solid var(--kj-accent);
      border-radius: var(--kj-radius-md); cursor: pointer; font-family: inherit; font-size: 0.875rem; font-weight: 500;
    }
    button:hover { background: #2563eb; }
    [kjPopoverContent] {
      position: absolute; top: calc(100% + 8px); left: 0; z-index: 20;
      background: var(--kj-surface); border: 1px solid var(--kj-border); border-radius: var(--kj-radius-lg);
      box-shadow: var(--kj-shadow-md); padding: 1rem; min-width: 14rem;
    }
    [kjPopoverContent][hidden] { display: none; }
    .popover-title { font-size: 0.875rem; font-weight: 600; color: var(--kj-text); margin: 0 0 0.375rem; }
    .popover-body { font-size: 0.8125rem; color: var(--kj-text-muted); margin: 0 0 1rem; line-height: 1.5; }
    .popover-footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .btn-cancel { padding: 0.35rem 0.875rem; background: var(--kj-surface); color: #374151; border: 1px solid var(--kj-border); border-radius: var(--kj-radius-sm); cursor: pointer; font-size: 0.8125rem; font-weight: 500; }
    .btn-cancel:hover { background: #f3f4f6; }
    .btn-primary { padding: 0.35rem 0.875rem; background: var(--kj-accent); color: var(--kj-accent-on); border: 1px solid var(--kj-accent); border-radius: var(--kj-radius-sm); cursor: pointer; font-size: 0.8125rem; font-weight: 500; }
    .btn-primary:hover { background: #2563eb; }
  `],
  template: `
    <div class="anchor" kjPopover>
      <button kjPopoverTrigger>Preferences</button>
      <div kjPopoverContent>
        <p class="popover-title">Notification Preferences</p>
        <p class="popover-body">Choose how you receive alerts and account notifications.</p>
        <div class="popover-footer">
          <button class="btn-cancel" kjPopoverClose>Cancel</button>
          <button class="btn-primary" kjPopoverClose>Apply</button>
        </div>
      </div>
    </div>
  `,
})
export class PopoverFinanceExample {}
