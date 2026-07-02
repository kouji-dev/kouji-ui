import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjButton } from '../button';

@Component({
  selector: 'kj-example-button-retro',
  standalone: true,
  imports: [KjButton],
  styleUrls: ['../../styles/docs-themes.css'],
  styles: [
    `
      :host {
        display: block;
        padding: 2rem;
        background: var(--kj-bg);
        font-family: var(--kj-font);
        color: var(--kj-text);
      }
      .row {
        display: flex;
        gap: 0.625rem;
        flex-wrap: wrap;
      }
      button[kjButton] {
        padding: 0.35rem 0.875rem;
        font-family: var(--kj-font);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        border: var(--kj-btn-border);
        border-radius: var(--kj-radius-md);
        cursor: pointer;
        box-shadow: var(--kj-shadow-sm);
        transition: var(--kj-transition);
      }
      button[kjButton]:not([data-variant='link']):not([data-variant='ghost']):hover {
        transform: translate(-1px, -1px);
        box-shadow: var(--kj-shadow-md);
      }
      button[kjButton][data-variant='default'] {
        background: var(--kj-text);
        color: var(--kj-bg);
      }
      button[kjButton][data-variant='destructive'] {
        background: var(--kj-destructive);
        color: #fff;
      }
      button[kjButton][data-variant='link'] {
        background: transparent;
        color: var(--kj-text);
        border: none;
        box-shadow: none;
        border-radius: 0;
        padding: 0.35rem 0.875rem;
        text-decoration: none;
      }
      button[kjButton][data-variant='link']:hover {
        text-decoration: underline;
        text-decoration-thickness: 2px;
        text-underline-offset: 4px;
      }
      button[kjButton][data-variant='ghost'] {
        background: transparent;
        color: var(--kj-text);
        border: 2px solid transparent;
        box-shadow: none;
        opacity: 0.7;
      }
      button[kjButton][data-variant='ghost']:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.06);
      }
      [aria-disabled='true'] {
        opacity: 0.4;
        pointer-events: none;
      }
    `,
  ],
  host: { class: 'kj-theme-retro' },
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
export class ButtonRetroExample {}
