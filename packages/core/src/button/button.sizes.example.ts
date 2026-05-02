import { Component } from '@angular/core';
import { KjButton } from './button';

@Component({
  selector: 'kj-example-button-sizes',
  standalone: true,
  imports: [KjButton],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [`
    :host { display: block; padding: 2rem; background: var(--kj-bg); font-family: var(--kj-font); }
    .col { display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start; }
    button[kjButton] { background: var(--kj-accent); color: var(--kj-accent-on); border: var(--kj-btn-border); cursor: pointer; font-family: var(--kj-font); transition: var(--kj-transition); }
    [data-size="sm"] { padding: 0.3rem 0.75rem; font-size: 0.75rem; }
    [data-size="md"] { padding: 0.5rem 1.25rem; font-size: 0.875rem; }
    [data-size="lg"] { padding: 0.75rem 1.75rem; font-size: 1rem; }
  `],
  template: `
    <div class="col">
      <button kjButton [kjSize]="'sm'">Small</button>
      <button kjButton [kjSize]="'md'">Medium (default)</button>
      <button kjButton [kjSize]="'lg'">Large</button>
    </div>
  `,
})
export class ButtonSizesExample {}
