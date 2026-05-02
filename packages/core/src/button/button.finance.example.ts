import { Component } from '@angular/core';
import { KjButton } from './button';

@Component({
  selector: 'kj-example-button-finance',
  standalone: true,
  imports: [KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: block; padding: 2rem; background: var(--kj-bg); font-family: var(--kj-font); color: var(--kj-text); }
    .row { display: flex; gap: 0.625rem; flex-wrap: wrap; }
    button[kjButton] {
      padding: 0.4rem 1rem; font-family: var(--kj-font); font-size: 0.8125rem; font-weight: 500;
      border: var(--kj-btn-border); border-radius: var(--kj-radius-md); cursor: pointer;
      transition: var(--kj-transition); line-height: 1.5;
    }
    [data-variant="default"] { background: var(--kj-accent); color: var(--kj-accent-on); border-color: var(--kj-accent); }
    [data-variant="default"]:hover { background: #2563eb; }
    [data-variant="destructive"] { background: var(--kj-destructive); color: #fff; border-color: var(--kj-destructive); }
    [data-variant="outline"] { background: transparent; color: var(--kj-text); border: 1px solid var(--kj-border); }
    [data-variant="outline"]:hover { background: var(--kj-bg); }
    [data-variant="ghost"] { background: transparent; color: var(--kj-text-muted); border-color: transparent; }
    [aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; }
  `],
  host: { class: 'kj-theme-finance' },
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
export class ButtonFinanceExample {}
