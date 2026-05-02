import { Component } from '@angular/core';
import {
  KjPopover, KjPopoverTrigger,
  KjPopoverContent, KjPopoverClose,
} from './popover';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-popover-basic',
  standalone: true,
  imports: [
    KjPopover, KjPopoverTrigger,
    KjPopoverContent, KjPopoverClose,
    KjButton,
  ],
  styles: [`
    :host { display: flex; align-items: flex-start; justify-content: center; padding: 3rem 2rem 10rem; background: #0c0c0c; font-family: 'JetBrains Mono', monospace; min-height: 220px; }
    .anchor { position: relative; display: inline-block; }
    button[kjButton] { padding: 0.5rem 1.25rem; border: 1px solid #444; background: transparent; color: #f0ede6; cursor: pointer; font-family: inherit; font-size: 0.875rem; }
    button[kjButton]:hover { border-color: #b8f500; color: #b8f500; }
    [kjPopoverContent] {
      position: absolute; top: calc(100% + 8px); left: 0; z-index: 20;
      background: #1a1a1a; border: 1px solid #333; padding: 1rem; min-width: 14rem;
      color: #f0ede6;
    }
    [kjPopoverContent][hidden] { display: none; }
    [kjPopoverContent][data-align="end"] { left: auto; right: 0; }
    .popover-title { font-size: 0.875rem; font-weight: 600; margin: 0 0 0.5rem; color: #b8f500; }
    .popover-body { font-size: 0.8125rem; color: #888; margin: 0 0 1rem; line-height: 1.5; }
    .popover-footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .popover-footer button[kjButton] { padding: 0.35rem 0.875rem; font-size: 0.8125rem; }
    [data-variant="default"] { border-color: #b8f500; color: #0c0c0c; background: #b8f500; }
    [data-variant="ghost"] { border-color: transparent; background: transparent; color: #888; }
  `],
  template: `
    <div class="anchor" kjPopover>
      <button kjButton kjPopoverTrigger>Open Popover</button>
      <div kjPopoverContent>
        <p class="popover-title">Notification Settings</p>
        <p class="popover-body">Control how and when you receive notifications from this app.</p>
        <div class="popover-footer">
          <button kjButton kjPopoverClose [kjVariant]="'ghost'">Cancel</button>
          <button kjButton kjPopoverClose [kjVariant]="'default'">Save</button>
        </div>
      </div>
    </div>
  `,
})
export class PopoverBasicExample {}
