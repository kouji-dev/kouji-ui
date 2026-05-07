import { Component, signal } from '@angular/core';
import type { KjPopoverCloseEvent } from '@kouji-ui/core';
import {
  KjPopoverComponent,
  KjPopoverTriggerComponent,
  KjPopoverContentComponent,
  KjPopoverTitleComponent,
  KjPopoverCloseComponent,
} from './popover';
import { KjButtonComponent } from '../button/button';

/**
 * Cancellable close. The `(kjCloseRequested)` output fires before any close —
 * outside-click, Escape, programmatic, close-button — and consumer code can
 * call `event.preventDefault()` to veto. Useful for "discard changes?" prompts
 * around forms with unsaved edits.
 *
 * Toggle "Has unsaved edits" to switch between confirming on close and closing
 * freely. Cancellation is per-event: each subsequent close attempt fires a
 * new cancellable event.
 */
@Component({
  selector: 'kj-popover-cancellable-example',
  standalone: true,
  imports: [
    KjPopoverComponent,
    KjPopoverTriggerComponent,
    KjPopoverContentComponent,
    KjPopoverTitleComponent,
    KjPopoverCloseComponent,
    KjButtonComponent,
  ],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 14rem; }
    .kj-popover-cancellable-example__row { display: flex; align-items: center; gap: var(--kj-space-md); }
    .kj-popover-cancellable-example__body { margin: 0 0 var(--kj-space-md); }
    .kj-popover-cancellable-example__footer { display: flex; justify-content: flex-end; gap: var(--kj-space-sm); }
    .kj-popover-cancellable-example__status { font-size: 0.8125rem; color: var(--kj-color-base-content); opacity: 0.75; }
  `],
  template: `
    <div class="kj-popover-cancellable-example__row">
      <label>
        <input type="checkbox" [checked]="dirty()" (change)="dirty.set($any($event.target).checked)" />
        Has unsaved edits
      </label>
      <span class="kj-popover-cancellable-example__status">Last close reason: {{ lastReason() ?? '—' }}</span>
    </div>

    <kj-popover (kjCloseRequested)="onCloseRequested($event)">
      <kj-popover-trigger>
        <kj-button>Edit profile</kj-button>
      </kj-popover-trigger>
      <kj-popover-content kjAriaLabel="Edit profile">
        <kj-popover-title>Edit profile</kj-popover-title>
        <p class="kj-popover-cancellable-example__body">
          Pretend there is a form here. While "Has unsaved edits" is on, the
          popover will refuse to close.
        </p>
        <div class="kj-popover-cancellable-example__footer">
          <kj-popover-close>
            <kj-button kjVariant="ghost">Discard</kj-button>
          </kj-popover-close>
          <kj-popover-close>
            <kj-button kjVariant="default" (click)="dirty.set(false)">Save</kj-button>
          </kj-popover-close>
        </div>
      </kj-popover-content>
    </kj-popover>
  `,
})
export class KjPopoverCancellableExample {
  readonly dirty = signal(true);
  readonly lastReason = signal<string | null>(null);

  onCloseRequested(event: KjPopoverCloseEvent): void {
    this.lastReason.set(event.reason);
    if (this.dirty()) {
      event.preventDefault();
    }
  }
}
