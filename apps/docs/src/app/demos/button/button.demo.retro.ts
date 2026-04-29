import { Component } from '@angular/core';
import { KjButtonDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjButtonDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: #1c1410; font-family: Georgia, serif; }
    .row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
    button[kjButton] { padding: 0.5rem 1.25rem; font-family: Georgia, serif; font-size: 0.9rem; border: 2px solid; cursor: pointer; border-radius: 4px; transition: all 0.2s; letter-spacing: 0.03em; }
    [data-variant="default"] { background: #f0a020; color: #1c1410; border-color: #f0a020; }
    [data-variant="default"]:hover { background: #e09010; }
    [data-variant="destructive"] { background: transparent; color: #e05030; border-color: #e05030; }
    [data-variant="outline"] { background: transparent; color: #e8d5b0; border-color: #5a4030; }
    [data-variant="ghost"] { background: transparent; color: #8a7060; border-color: transparent; }
    [aria-disabled="true"] { opacity: 0.4; cursor: not-allowed; }
  `],
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'">Default</button>
      <button kjButton [kjVariant]="'destructive'">Destructive</button>
      <button kjButton [kjVariant]="'outline'">Outline</button>
      <button kjButton [kjVariant]="'ghost'">Ghost</button>
      <button kjButton [kjDisabled]="true">Disabled</button>
    </div>
  `,
})
export class ButtonDemoRetroComponent {}
