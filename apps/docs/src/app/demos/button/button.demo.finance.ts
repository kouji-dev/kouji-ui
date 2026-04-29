import { Component } from '@angular/core';
import { KjButtonDirective } from '@kouji-ui/core';

@Component({
  selector: 'kj-demo-button-finance',
  standalone: true,
  imports: [KjButtonDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: #0a0d12; font-family: 'JetBrains Mono', monospace; }
    .row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    button[kjButton] { padding: 0.375rem 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; border: 1px solid; cursor: pointer; border-radius: 0; transition: all 0.1s; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; }
    [data-variant="default"] { background: #00d4aa; color: #0a0d12; border-color: #00d4aa; }
    [data-variant="default"]:hover { background: #00bfa0; }
    [data-variant="destructive"] { background: #ff4444; color: #fff; border-color: #ff4444; }
    [data-variant="outline"] { background: transparent; color: #00d4aa; border-color: #00d4aa; }
    [data-variant="ghost"] { background: transparent; color: #4a6080; border-color: transparent; }
    [aria-disabled="true"] { opacity: 0.35; cursor: not-allowed; }
  `],
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'">Default</button>
      <button kjButton [kjVariant]="'destructive'">Sell</button>
      <button kjButton [kjVariant]="'outline'">Outline</button>
      <button kjButton [kjVariant]="'ghost'">Ghost</button>
      <button kjButton [kjDisabled]="true">Disabled</button>
    </div>
  `,
})
export class ButtonDemoFinanceComponent {}
