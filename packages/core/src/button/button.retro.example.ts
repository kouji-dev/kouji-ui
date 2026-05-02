import { Component } from '@angular/core';
import { KjButton } from './button';

@Component({
  selector: 'kj-example-button-retro',
  standalone: true,
  imports: [KjButton],
  styles: [`
    :host { display: block; padding: 2rem; background: #fef9c3; font-family: 'Courier New', monospace; }
    .row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
    button[kjButton] { padding: 0.5rem 1.125rem; font-family: 'Courier New', monospace; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; border: 2px solid #000; border-radius: 0; cursor: pointer; box-shadow: 3px 3px 0 #000; transition: transform 0.08s, box-shadow 0.08s; }
    button[kjButton]:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #000; }
    [data-variant="default"] { background: #16a34a; color: #fff; }
    [data-variant="destructive"] { background: #dc2626; color: #fff; }
    [data-variant="outline"] { background: #fff; color: #1d4ed8; border-color: #1d4ed8; box-shadow: 3px 3px 0 #1d4ed8; }
    [data-variant="ghost"] { background: transparent; color: #000; box-shadow: none; }
    [aria-disabled="true"] { opacity: 0.4; cursor: not-allowed; transform: none !important; }
  `],
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'">Confirm</button>
      <button kjButton [kjVariant]="'destructive'">Delete</button>
      <button kjButton [kjVariant]="'outline'">Learn More</button>
      <button kjButton [kjVariant]="'ghost'">Cancel</button>
      <button kjButton [kjDisabled]="true">Disabled</button>
    </div>
  `,
})
export class ButtonRetroExample {}
