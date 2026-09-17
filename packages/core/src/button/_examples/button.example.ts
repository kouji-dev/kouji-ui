import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjButton } from '../button';

@Component({
  selector: 'kj-example-button',
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
        gap: 1rem;
        flex-wrap: wrap;
        align-items: center;
      }
      button[kjButton] {
        padding: 0.5rem 1.25rem;
        font-family: var(--docs-font);
        font-size: 0.875rem;
        border: var(--docs-btn-border);
        cursor: pointer;
        transition: var(--docs-transition);
      }
      [data-variant='default'] {
        background: var(--docs-accent);
        color: var(--docs-accent-on);
      }
      [data-variant='destructive'] {
        background: var(--docs-destructive);
        color: #fff;
      }
      [data-variant='link'] {
        background: transparent;
        color: var(--docs-accent);
        border: none;
        padding: 0.5rem 0.5rem;
        text-decoration: none;
        text-underline-offset: 4px;
      }
      [data-variant='link']:hover {
        text-decoration: underline;
      }
      [data-variant='ghost'] {
        background: transparent;
        color: var(--docs-btn-ghost-color);
      }
      [aria-disabled='true'] {
        opacity: 0.4;
        cursor: not-allowed;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
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
export class ButtonExample {}
