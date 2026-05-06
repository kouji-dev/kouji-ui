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
      padding: 4px 15px; font-family: var(--kj-font); font-size: 14px; font-weight: 400;
      border: 1px solid transparent; border-radius: 6px; cursor: pointer;
      transition: var(--kj-transition); line-height: 1.5;
    }
    button[kjButton][data-variant="default"]     { background: var(--kj-accent); color: var(--kj-accent-on); border-color: var(--kj-accent); }
    button[kjButton][data-variant="default"]:hover { background: #4096ff; border-color: #4096ff; }
    button[kjButton][data-variant="destructive"] { background: var(--kj-destructive); color: #fff; border-color: var(--kj-destructive); }
    button[kjButton][data-variant="link"]        { background: transparent; color: var(--kj-accent); border-color: transparent; }
    button[kjButton][data-variant="link"]:hover  { color: #4096ff; }
    button[kjButton][data-variant="ghost"]       { background: transparent; color: var(--kj-text); border: 1px solid var(--kj-text); }
    button[kjButton][data-variant="ghost"]:hover { color: var(--kj-accent); border-color: var(--kj-accent); }
    [aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; }
  `],
  host: { class: 'kj-theme-finance' },
  template: `
    <div class="row">
      <button kjButton [kjVariant]="'default'">Default</button>
      <button kjButton [kjVariant]="'destructive'">Destructive</button>
      <button kjButton [kjVariant]="'link'">Link</button>
      <button kjButton [kjVariant]="'ghost'">Ghost</button>
      <button kjButton [kjDisabled]="true">Disabled</button>
    </div>
  `,
})
export class ButtonFinanceExample {}
