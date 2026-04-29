import { Component } from '@angular/core';
import { KjButtonDirective } from './button.directive';

@Component({
  selector: 'kj-example-button-finance',
  standalone: true,
  imports: [KjButtonDirective],
  styles: [`
    :host { display: block; padding: 1.75rem 2rem; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif; }
    .row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    button[kjButton] { padding: 0.5rem 1rem; font-family: system-ui, sans-serif; font-size: 0.875rem; font-weight: 500; border-radius: 6px; border: 1px solid transparent; cursor: pointer; transition: background 0.12s; line-height: 1.5; }
    [data-variant="default"] { background: #3b82f6; color: #fff; border-color: #3b82f6; }
    [data-variant="default"]:hover { background: #2563eb; }
    [data-variant="destructive"] { background: #ef4444; color: #fff; }
    [data-variant="destructive"]:hover { background: #dc2626; }
    [data-variant="outline"] { background: #fff; color: #374151; border-color: #d1d5db; }
    [data-variant="outline"]:hover { background: #f9fafb; }
    [data-variant="ghost"] { background: transparent; color: #6b7280; }
    [data-variant="ghost"]:hover { background: #f3f4f6; }
    [aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; }
  `],
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'">Primary</button>
      <button kjButton [kjVariant]="'destructive'">Delete</button>
      <button kjButton [kjVariant]="'outline'">Secondary</button>
      <button kjButton [kjVariant]="'ghost'">Ghost</button>
      <button kjButton [kjDisabled]="true">Disabled</button>
    </div>
  `,
})
export class ButtonFinanceExample {}
