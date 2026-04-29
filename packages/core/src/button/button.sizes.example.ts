import { Component } from '@angular/core';
import { KjButtonDirective } from './button.directive';

@Component({
  selector: 'kj-example-button-sizes',
  standalone: true,
  imports: [KjButtonDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: #0c0c0c; font-family: 'JetBrains Mono', monospace; }
    .col { display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start; }
    button[kjButton] { background: #b8f500; color: #0c0c0c; border: none; cursor: pointer; font-family: inherit; }
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
