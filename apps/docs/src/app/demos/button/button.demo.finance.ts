import { Component } from '@angular/core';
import { KjButtonDirective } from '@kouji-ui/core';

@Component({
  selector: 'kj-demo-button-finance',
  standalone: true,
  imports: [KjButtonDirective],
  styles: [`
    :host { display: block; padding: 1.5rem 1.75rem; background: #0a0e14; font-family: 'Courier New', monospace; }
    .row { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    button[kjButton] {
      padding: 0.3rem 0.875rem;
      font-family: 'Courier New', monospace;
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-weight: bold;
      border: 1px solid;
      cursor: pointer;
      border-radius: 0;
      transition: background 0.08s;
    }
    [data-variant="default"] {
      background: #ff8c00;
      color: #0a0e14;
      border-color: #ff8c00;
    }
    [data-variant="default"]:hover { background: #e07800; border-color: #e07800; }
    [data-variant="destructive"] {
      background: transparent;
      color: #ff3333;
      border-color: #ff3333;
    }
    [data-variant="destructive"]:hover { background: rgba(255,51,51,0.12); }
    [data-variant="outline"] {
      background: transparent;
      color: #00b050;
      border-color: #00b050;
    }
    [data-variant="outline"]:hover { background: rgba(0,176,80,0.1); }
    [data-variant="ghost"] {
      background: transparent;
      color: #8b949e;
      border-color: #1f2d3d;
    }
    [data-variant="ghost"]:hover { color: #c9d1d9; border-color: #8b949e; }
    [aria-disabled="true"] { opacity: 0.3; cursor: not-allowed; }
  `],
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'">EXECUTE</button>
      <button kjButton [kjVariant]="'destructive'">SELL</button>
      <button kjButton [kjVariant]="'outline'">BUY</button>
      <button kjButton [kjVariant]="'ghost'">DETAILS</button>
      <button kjButton [kjDisabled]="true">SUSPENDED</button>
    </div>
  `,
})
export class ButtonDemoFinanceComponent {}
