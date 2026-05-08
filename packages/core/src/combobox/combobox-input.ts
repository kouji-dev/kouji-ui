import {
  afterNextRender,
  Directive,
  effect,
  ElementRef,
  inject,
} from '@angular/core';
import { KjDisabled, KjFocusRing, KjFormControl } from '../primitives';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import { onFocusOrInput } from '../primitives/overlay/strategies/trigger-event/on-focus-or-input';
import { KJ_COMBOBOX } from './combobox.context';

/**
 * Decorates a native `<input>` to act as the combobox trigger. Composes the
 * overlay primitive `KjOverlayTrigger` (wires `aria-expanded`,
 * `aria-controls`, `aria-haspopup`) and provides an `onFocusOrInput()`
 * trigger event strategy so the panel opens both on focus and on the first
 * keystroke. The host element keeps `role="combobox"` per the WAI-ARIA
 * combobox pattern.
 *
 * Keyboard contract:
 * - ArrowDown / ArrowUp: move active option (Alt+ArrowDown opens, Alt+ArrowUp closes).
 * - Enter: commit active option (or free-text query).
 * - Escape / Tab: close the listbox.
 *
 * @category Core/Inputs
 */
@Directive({
  selector: 'input[kjComboboxInput]',
  exportAs: 'kjComboboxInput',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFocusRing,
    KjFormControl,
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
  ],
  providers: [
    KjOverlayController,
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => onFocusOrInput() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'listbox' as const },
  ],
  host: {
    'role': 'combobox',
    'autocomplete': 'off',
    'autocapitalize': 'off',
    'autocorrect': 'off',
    'spellcheck': 'false',
    '[attr.aria-autocomplete]': '"list"',
    '[attr.aria-activedescendant]': 'ctx.activeId()',
    '[attr.aria-busy]': 'ctx.loading() ? "true" : null',
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjComboboxInput {
  /** @internal */
  readonly ctx = inject(KJ_COMBOBOX);
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  /** @internal — public so sibling `[kjFor]` panels can read it. */
  readonly controller = inject(KjOverlayController);

  constructor() {
    // Wire the controller into the root combobox so its state mutations
    // (show/hide/move/select) drive the overlay primitive.
    if ('attachController' in this.ctx) {
      (this.ctx as { attachController(c: KjOverlayController): void }).attachController(
        this.controller,
      );
    }

    // Mirror controller open state into the root context so option/filter
    // logic (which reads `ctx.open()`) stays reactive.
    effect(() => {
      const isOpen = this.controller.isOpen();
      if ('setOpenState' in this.ctx) {
        (this.ctx as { setOpenState(v: boolean): void }).setOpenState(isOpen);
      }
    });

    afterNextRender(() => {
      this.ctx.setInputElement(this.el.nativeElement);
    });
  }

  /** @internal */
  onInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.ctx.setQuery(v);
  }

  /** @internal */
  onKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (e.altKey) {
          this.ctx.show();
        } else {
          this.ctx.move(1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (e.altKey) {
          this.ctx.hide();
        } else {
          this.ctx.move(-1);
        }
        break;
      case 'Enter':
        if (this.ctx.open() || this.ctx.allowFreeText()) {
          e.preventDefault();
          this.ctx.commitActive();
        }
        break;
      case 'Escape':
        if (this.ctx.open()) {
          e.preventDefault();
          this.ctx.hide();
        }
        break;
      case 'Tab':
        if (this.ctx.open()) this.ctx.hide();
        break;
    }
  }

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
