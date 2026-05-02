import { Component } from '@angular/core';
import {
  KjPopover, KjPopoverTrigger,
  KjPopoverContent, KjPopoverClose,
} from './popover';

@Component({
  selector: 'kj-example-popover-retro',
  standalone: true,
  imports: [
    KjPopover, KjPopoverTrigger,
    KjPopoverContent, KjPopoverClose,
  ],
  styles: [`
    :host { display: flex; align-items: flex-start; justify-content: center; padding: 3rem 2rem 10rem; background: #fef9c3; font-family: 'Courier New', monospace; min-height: 220px; color: #000; }
    .anchor { position: relative; display: inline-block; }
    button {
      padding: 0.4rem 1rem; font-family: 'Courier New', monospace; font-size: 0.8rem; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase; background: #fff; color: #000;
      border: 2px solid #000; border-radius: 0; cursor: pointer;
      box-shadow: 3px 3px 0 #000; transition: transform 0.08s, box-shadow 0.08s;
    }
    button:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #000; }
    [kjPopoverContent] {
      position: absolute; top: calc(100% + 8px); left: 0; z-index: 20;
      background: #fef9c3; border: 2px solid #000; box-shadow: 5px 5px 0 #000;
      padding: 1rem; min-width: 14rem; font-family: 'Courier New', monospace;
    }
    [kjPopoverContent][hidden] { display: none; }
    .popover-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 0.5rem; border-bottom: 2px solid #000; padding-bottom: 0.375rem; color: #000; }
    .popover-body { font-size: 0.75rem; color: #444; margin: 0.5rem 0 1rem; line-height: 1.6; }
    .popover-footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .popover-footer button { padding: 0.3rem 0.75rem; font-size: 0.7rem; box-shadow: 2px 2px 0 #000; }
    .popover-footer button:hover { box-shadow: 3px 3px 0 #000; }
    .btn-primary { background: #16a34a; color: #fff; border-color: #000; }
  `],
  template: `
    <div class="anchor" kjPopover>
      <button kjPopoverTrigger>Settings</button>
      <div kjPopoverContent>
        <p class="popover-title">Notifications</p>
        <p class="popover-body">Configure notification frequency and delivery preferences.</p>
        <div class="popover-footer">
          <button kjPopoverClose>Cancel</button>
          <button kjPopoverClose class="btn-primary">Save</button>
        </div>
      </div>
    </div>
  `,
})
export class PopoverRetroExample {}
