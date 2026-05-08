import { Component } from '@angular/core';
import { KjPopoverTrigger } from './popover-trigger';
import { KjPopoverContent } from './popover-content';
import { KjPopoverTitle } from './popover-title';
import { KjPopoverClose } from './popover-close';

@Component({
  selector: 'kj-example-popover-retro',
  standalone: true,
  imports: [
    KjPopoverTrigger,
    KjPopoverContent,
    KjPopoverTitle,
    KjPopoverClose,
  ],
  styleUrls: ['../styles/docs-themes.css'],
  host: { class: 'kj-theme-retro' },
  styles: [`
    :host { display: flex; align-items: flex-start; justify-content: center; padding: 3rem 2rem 10rem; background: var(--kj-bg); font-family: var(--kj-font); min-height: 220px; color: var(--kj-text); }
    button {
      padding: 0.4rem 1rem; font-family: var(--kj-font); font-size: 0.8rem; font-weight: 700;
      letter-spacing: 0.06em; text-transform: uppercase; background: var(--kj-surface); color: var(--kj-text);
      border: var(--kj-btn-border); border-radius: 0; cursor: pointer;
      box-shadow: var(--kj-shadow-sm); transition: var(--kj-transition);
    }
    button:hover { transform: translate(-1px, -1px); box-shadow: var(--kj-shadow-md); }
    kj-popover-content {
      display: block; z-index: 20;
      background: var(--kj-bg); border: var(--kj-btn-border); box-shadow: var(--kj-shadow-hard);
      padding: 1rem; min-width: 14rem; font-family: var(--kj-font);
    }
    .popover-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 0.5rem; border-bottom: var(--kj-btn-border); padding-bottom: 0.375rem; color: var(--kj-text); }
    .popover-body { font-size: 0.75rem; color: var(--kj-text-muted); margin: 0.5rem 0 1rem; line-height: 1.6; }
    .popover-footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .popover-footer button { padding: 0.3rem 0.75rem; font-size: 0.7rem; box-shadow: var(--kj-shadow-sm); }
    .popover-footer button:hover { box-shadow: var(--kj-shadow-md); }
    .btn-primary { background: var(--kj-accent); color: var(--kj-accent-on); border-color: var(--kj-border); }
  `],
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
