import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjButton } from '../button';

@Component({
  selector: 'kj-example-button-sizes',
  standalone: true,
  imports: [KjButton],
  styleUrls: ['../../styles/docs-themes.css'],
  styles: [
    `
      :host {
        display: block;
        padding: 2rem;
        background: var(--docs-bg);
        font-family: var(--docs-font);
      }
      .row {
        display: flex;
        flex-direction: row;
        gap: 0.75rem;
        align-items: center;
        flex-wrap: wrap;
      }
      button[kjButton] {
        background: var(--docs-accent);
        color: var(--docs-accent-on);
        border: var(--docs-btn-border);
        cursor: pointer;
        font-family: var(--docs-font);
        transition: var(--docs-transition);
      }
      [data-size='sm'] {
        padding: 0.3rem 0.75rem;
        font-size: 0.75rem;
      }
      [data-size='md'] {
        padding: 0.5rem 1.25rem;
        font-size: 0.875rem;
      }
      [data-size='lg'] {
        padding: 0.75rem 1.75rem;
        font-size: 1rem;
      }
      [data-size='xl'] {
        padding: 0.875rem 2.25rem;
        font-size: 1.0625rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="row">
      <button kjButton [kjSize]="'sm'">Small</button>
      <button kjButton [kjSize]="'md'">Medium (default)</button>
      <button kjButton [kjSize]="'lg'">Large</button>
      <button kjButton [kjSize]="'xl'">Extra-large</button>
    </div>
  `,
})
export class ButtonSizesExample {}
