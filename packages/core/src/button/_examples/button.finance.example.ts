import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjButton } from '../button';

@Component({
  selector: 'kj-example-button-finance',
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
        color: var(--docs-text);
      }
      .row {
        display: flex;
        gap: 0.625rem;
        flex-wrap: wrap;
      }
      button[kjButton] {
        padding: 4px 15px;
        font-family: var(--docs-font);
        font-size: 14px;
        font-weight: 400;
        border: 1px solid transparent;
        border-radius: 6px;
        cursor: pointer;
        transition: var(--docs-transition);
        line-height: 1.5;
      }
      button[kjButton][data-variant='default'] {
        background: var(--docs-accent);
        color: var(--docs-accent-on);
        border-color: var(--docs-accent);
      }
      button[kjButton][data-variant='default']:hover {
        background: #4096ff;
        border-color: #4096ff;
      }
      button[kjButton][data-variant='destructive'] {
        background: var(--docs-destructive);
        color: #fff;
        border-color: var(--docs-destructive);
      }
      button[kjButton][data-variant='link'] {
        background: transparent;
        color: var(--docs-accent);
        border-color: transparent;
      }
      button[kjButton][data-variant='link']:hover {
        color: #4096ff;
      }
      button[kjButton][data-variant='ghost'] {
        background: transparent;
        color: var(--docs-text);
        border: 1px solid var(--docs-text);
      }
      button[kjButton][data-variant='ghost']:hover {
        color: var(--docs-accent);
        border-color: var(--docs-accent);
      }
      [aria-disabled='true'] {
        opacity: 0.45;
        cursor: not-allowed;
      }
    `,
  ],
  host: { class: 'kj-theme-finance' },
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
export class ButtonFinanceExample {}
