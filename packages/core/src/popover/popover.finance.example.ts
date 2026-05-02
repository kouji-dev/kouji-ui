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
  styles: [`
    :host { display: flex; align-items: flex-start; justify-content: center; padding: 3rem 2rem 10rem; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif; min-height: 220px; }
    .anchor { position: relative; display: inline-block; }
    button {
      padding: 0.4rem 1rem; background: #3b82f6; color: #fff; border: 1px solid #3b82f6;
      border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 0.875rem; font-weight: 500;
    }
    button:hover { background: #2563eb; }
    [kjPopoverContent] {
      position: absolute; top: calc(100% + 8px); left: 0; z-index: 20;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.1); padding: 1rem; min-width: 14rem;
    }
    [kjPopoverContent][hidden] { display: none; }
    .popover-title { font-size: 0.875rem; font-weight: 600; color: #111827; margin: 0 0 0.375rem; }
    .popover-body { font-size: 0.8125rem; color: #6b7280; margin: 0 0 1rem; line-height: 1.5; }
    .popover-footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .btn-cancel { padding: 0.35rem 0.875rem; background: #fff; color: #374151; border: 1px solid #d1d5db; border-radius: 5px; cursor: pointer; font-size: 0.8125rem; font-weight: 500; }
    .btn-cancel:hover { background: #f3f4f6; }
    .btn-primary { padding: 0.35rem 0.875rem; background: #3b82f6; color: #fff; border: 1px solid #3b82f6; border-radius: 5px; cursor: pointer; font-size: 0.8125rem; font-weight: 500; }
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
