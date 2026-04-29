import { Component } from '@angular/core';
import { KjButtonDirective } from '@kouji-ui/core';

@Component({
  selector: 'kj-demo-button-finance',
  standalone: true,
  imports: [KjButtonDirective],
  styles: [`
    :host { display: block; padding: 1.75rem 2rem; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif; }
    .row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    button[kjButton] {
      padding: 0.5rem 1rem;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s, box-shadow 0.12s, opacity 0.12s;
      line-height: 1.5;
    }
    [data-variant="default"] {
      background: #3b82f6;
      color: #ffffff;
      border-color: #3b82f6;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    [data-variant="default"]:hover {
      background: #2563eb;
      border-color: #2563eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    [data-variant="destructive"] {
      background: #ef4444;
      color: #ffffff;
      border-color: #ef4444;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    [data-variant="destructive"]:hover { background: #dc2626; border-color: #dc2626; }
    [data-variant="outline"] {
      background: #ffffff;
      color: #374151;
      border-color: #d1d5db;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    [data-variant="outline"]:hover { background: #f9fafb; border-color: #9ca3af; }
    [data-variant="ghost"] {
      background: transparent;
      color: #6b7280;
      border-color: transparent;
    }
    [data-variant="ghost"]:hover { background: #f3f4f6; color: #374151; }
    [aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
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
export class ButtonDemoFinanceComponent {}
