import { Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { KjToastViewport, KjToast } from './toast';
import { KjToastService } from './toast.service';
import { KjButton } from '../button/button';

@Component({
  selector: 'kj-example-toast-basic',
  standalone: true,
  imports: [KjToastViewport, KjToast, KjButton, NgTemplateOutlet],
  styleUrls: ['../styles/docs-themes.css'],
  styles: [
    `
      :host {
        display: block;
        background: var(--kj-bg);
        font-family: var(--kj-font);
        min-height: 360px;
        position: relative;
        overflow: hidden;
      }
      .row {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      button[kjButton] {
        padding: 0.4rem 1rem;
        border: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.8125rem;
      }
      button[kjButton][data-variant='success'] {
        background: #4ade80;
        color: #0c0c0c;
      }
      button[kjButton][data-variant='destructive'] {
        background: #ef4444;
        color: #fff;
      }
      button[kjButton][data-variant='warning'] {
        background: #fb923c;
        color: #0c0c0c;
      }
      button[kjButton][data-variant='default'] {
        background: #b8f500;
        color: #0c0c0c;
      }

      /* ── Viewport: positioned via [data-position-*] ── */
      [kjToastViewport] {
        position: absolute;
        width: 22rem;
        max-width: calc(100% - 2rem);
        list-style: none;
        padding: 0;
        margin: 0;
        z-index: var(--kj-toast-z-index);
      }
      [kjToastViewport][data-position-y='bottom'] {
        bottom: 1rem;
      }
      [kjToastViewport][data-position-y='top'] {
        top: 1rem;
      }
      [kjToastViewport][data-position-x='end'] {
        right: 1rem;
      }
      [kjToastViewport][data-position-x='start'] {
        left: 1rem;
      }

      /* Each <li> wraps a toast — absolutely positioned so siblings overlap.
       The viewport itself stays a 0-height anchor; the front toast pegs to its edge. */
      [kjToastViewport] li {
        position: absolute;
        left: 0;
        right: 0;
        transition:
          transform 0.4s cubic-bezier(0.21, 0.61, 0.35, 1),
          opacity 0.3s ease;
      }
      [kjToastViewport][data-position-y='bottom'] li {
        bottom: 0;
      }
      [kjToastViewport][data-position-y='top'] li {
        top: 0;
      }

      /* ── COLLAPSED stack: only the front toast is fully visible.
       Each older toast scales down 5% per level, lifts upward by index*gap,
       and shrinks to the front toast's height. ── */
      [kjToastViewport][data-expanded='false'] [kjToast]:not([data-front='true']) {
        height: var(--kj-toast-front-height);
        overflow: hidden;
        transform: translateY(calc((var(--kj-toast-index) - 1) * var(--kj-toast-gap) * -1))
          scale(calc(1 - (var(--kj-toast-index) - 1) * 0.06));
        opacity: calc(1 - (var(--kj-toast-index) - 1) * 0.25);
      }
      [kjToastViewport][data-position-y='top'][data-expanded='false']
        [kjToast]:not([data-front='true']) {
        transform: translateY(calc((var(--kj-toast-index) - 1) * var(--kj-toast-gap)))
          scale(calc(1 - (var(--kj-toast-index) - 1) * 0.06));
      }

      /* ── EXPANDED: each toast lifts by its measured height + gap, summed for older toasts.
       Uses --kj-toast-before (older count visible behind). ── */
      [kjToastViewport][data-expanded='true'] [kjToast] {
        transform: translateY(
          calc(
            (var(--kj-toast-index) - 1) * (var(--kj-toast-height, 0px) + var(--kj-toast-gap)) * -1
          )
        );
      }
      [kjToastViewport][data-position-y='top'][data-expanded='true'] [kjToast] {
        transform: translateY(
          calc((var(--kj-toast-index) - 1) * (var(--kj-toast-height, 0px) + var(--kj-toast-gap)))
        );
      }

      /* ── Toast appearance ── */
      [kjToast] {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        font-size: 0.8125rem;
        border-radius: 8px;
        box-shadow:
          0 4px 12px rgba(0, 0, 0, 0.15),
          0 1px 0 rgba(255, 255, 255, 0.04) inset;
        animation: enter 0.35s cubic-bezier(0.21, 0.61, 0.35, 1);
      }
      @keyframes enter {
        from {
          opacity: 0;
          transform: translateY(100%) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .icon {
        font-size: 1rem;
        line-height: 1.2;
        flex-shrink: 0;
      }
      .body {
        flex: 1;
        min-width: 0;
        line-height: 1.4;
      }
      .title {
        font-weight: 600;
        margin-bottom: 0.125rem;
      }
      .close {
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.5;
        font-size: 1.1rem;
        color: inherit;
        padding: 0;
        line-height: 1;
        flex-shrink: 0;
      }
      .close:hover {
        opacity: 1;
      }

      [kjToast][data-variant='success'] {
        background: #052e16;
        color: #86efac;
        border: 1px solid #166534;
      }
      [kjToast][data-variant='destructive'] {
        background: #2c0a0a;
        color: #fca5a5;
        border: 1px solid #991b1b;
      }
      [kjToast][data-variant='warning'] {
        background: #2c1a04;
        color: #fcd34d;
        border: 1px solid #92400e;
      }
      [kjToast][data-variant='default'] {
        background: #1a1a1a;
        color: #f0ede6;
        border: 1px solid #2a2a2a;
      }
      [kjToast][data-variant='success'] .icon {
        color: #4ade80;
      }
      [kjToast][data-variant='destructive'] .icon {
        color: #f87171;
      }
      [kjToast][data-variant='warning'] .icon {
        color: #fb923c;
      }
      [kjToast][data-variant='default'] .icon {
        color: #b8f500;
      }
    `,
  ],
  template: `
    <div class="row">
      <button
        kjButton
        [attr.data-variant]="'success'"
        (click)="toast.show('Changes saved successfully!', { variant: 'success' })"
      >
        Success
      </button>
      <button
        kjButton
        [attr.data-variant]="'destructive'"
        (click)="toast.show('Something went wrong!', { variant: 'destructive' })"
      >
        Error
      </button>
      <button
        kjButton
        [attr.data-variant]="'warning'"
        (click)="toast.show('Session expires in 5 minutes.', { variant: 'warning' })"
      >
        Warning
      </button>
      <button
        kjButton
        [attr.data-variant]="'default'"
        (click)="toast.show('New update available.')"
      >
        Info
      </button>
    </div>

    <ol
      kjToastViewport
      [kjToastDefaultTemplate]="defaultTpl"
      #vp="kjToastViewport"
      aria-label="Notifications"
    >
      @for (r of vp.renderable(); track r.id) {
        <li><ng-container *ngTemplateOutlet="r.template; context: r.context" /></li>
      }
    </ol>

    <ng-template #defaultTpl let-ctx>
      <div kjToast [kjToastVariant]="ctx.variant" [kjToastId]="ctx.id">
        <span class="icon" aria-hidden="true">{{ iconFor(ctx.variant) }}</span>
        <div class="body">
          @if (ctx.title) {
            <div class="title">{{ ctx.title }}</div>
          }
          <span>{{ ctx.message }}</span>
        </div>
        <button class="close" (click)="ctx.dismiss()" aria-label="Dismiss">×</button>
      </div>
    </ng-template>
  `,
})
export class ToastBasicExample {
  readonly toast = inject(KjToastService);

  iconFor(variant: 'default' | 'success' | 'destructive' | 'warning'): string {
    switch (variant) {
      case 'success':
        return '✓';
      case 'destructive':
        return '✕';
      case 'warning':
        return '!';
      default:
        return 'ℹ';
    }
  }
}
