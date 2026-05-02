import { Component } from '@angular/core';
import { KjButton } from './button';

@Component({
  selector: 'kj-example-button',
  standalone: true,
  imports: [KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: block; padding: 2rem; background: var(--kj-bg); font-family: var(--kj-font); }
    .row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
    button[kjButton] { padding: 0.5rem 1.25rem; font-family: var(--kj-font); font-size: 0.875rem; border: var(--kj-btn-border); cursor: pointer; transition: var(--kj-transition); }
    [data-variant="default"] { background: var(--kj-accent); color: var(--kj-accent-on); }
    [data-variant="destructive"] { background: var(--kj-destructive); color: #fff; }
    [data-variant="outline"] { background: transparent; color: var(--kj-text); border: var(--kj-btn-outline-border); }
    [data-variant="ghost"] { background: transparent; color: var(--kj-btn-ghost-color); }
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
export class ButtonExample {}
