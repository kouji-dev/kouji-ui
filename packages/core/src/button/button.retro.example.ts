import { Component } from '@angular/core';
import { KjButton } from './button';

@Component({
  selector: 'kj-example-button-retro',
  standalone: true,
  imports: [KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: block; padding: 2rem; background: var(--kj-bg); font-family: var(--kj-font); color: var(--kj-text); }
    .row { display: flex; gap: 0.625rem; flex-wrap: wrap; }
    button[kjButton] {
      padding: 0.35rem 0.875rem; font-family: var(--kj-font); font-size: 0.75rem;
      font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      border: var(--kj-btn-border); border-radius: var(--kj-radius-md); cursor: pointer;
      box-shadow: var(--kj-shadow-sm); transition: var(--kj-transition);
    }
    button[kjButton]:hover { transform: translate(-1px, -1px); box-shadow: var(--kj-shadow-md); }
    [data-variant="default"] { background: var(--kj-text); color: var(--kj-bg); }
    [data-variant="destructive"] { background: var(--kj-destructive); color: #fff; }
    [data-variant="outline"] { background: var(--kj-bg); color: var(--kj-text); }
    [data-variant="ghost"] { background: transparent; color: var(--kj-btn-ghost-color); border-color: transparent; box-shadow: none; }
    [data-variant="ghost"]:hover { box-shadow: none; transform: none; }
    [aria-disabled="true"] { opacity: 0.4; pointer-events: none; }
  `],
  host: { class: 'kj-theme-retro' },
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
export class ButtonRetroExample {}
