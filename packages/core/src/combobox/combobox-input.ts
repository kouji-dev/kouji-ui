import {
  afterNextRender,
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
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
import { KjListNavigator } from '../primitives/list';
import { KjCombobox } from './combobox-root';

/**
 * Decorates a native `<input>` to act as the combobox trigger. Composes the
 * overlay primitive `KjOverlayTrigger` (wires `aria-expanded`,
 * `aria-controls`, `aria-haspopup`) and `KjListNavigator` (APG combobox 1.2
 * keyboard contract: ArrowUp/Down/Home/End/PageUp/PageDown/Enter/Space).
 * Provides an `onFocusOrInput()` trigger event strategy so the panel opens
 * both on focus and on the first keystroke.
 *
 * Adds a free-text Enter handler that fires only when the navigator had no
 * active item (signaled via `e.defaultPrevented === false` after the
 * navigator's host listener runs first).
 *
 * Keyboard contract:
 * - ArrowDown / ArrowUp: move active option (handled by KjListNavigator).
 * - Enter: commit active option (KjListNavigator); or free-text query when no
 *   active item and `kjFreeText=true`.
 * - Escape: close the listbox.
 *
 * @doc-category Core/Inputs
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
    KjListNavigator,
  ],
  providers: [
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
    '[attr.aria-busy]': 'ctx.loading() ? "true" : null',
    '(input)': 'onInput($event)',
    '(keydown.enter)': 'onEnter($event)',
    '(keydown.escape)': 'onEscape($event)',
    '(keydown.alt.arrowdown)': '$event.preventDefault(); ctx.show()',
    '(keydown.alt.arrowup)': '$event.preventDefault(); ctx.hide()',
    '(keydown.tab)': 'ctx.open() && ctx.hide()',
  },
})
export class KjComboboxInput implements OnInit, OnDestroy {
  /** @internal */
  readonly ctx = inject(KjCombobox);
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly nav = inject(KjListNavigator);

  /** @internal — public so sibling `[kjFor]` panels can read it. */
  readonly controller = inject(KjOverlayController);

  constructor() {
    afterNextRender(() => {
      this.ctx.setInputElement(this.el.nativeElement);
    });
  }

  ngOnInit(): void {
    this.ctx._setNavigator(this.nav);
  }

  ngOnDestroy(): void {
    this.ctx.setInputElement(null);
    this.ctx._setNavigator(null);
  }

  /** @internal */
  onInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.ctx.setQuery(v);
  }

  /**
   * Handle Enter for free-text fallback. `KjListNavigator`'s host listener
   * fires first (hostDirectives run before consumer host listeners). When the
   * navigator had an active item it called `preventDefault()` and committed it
   * — we exit early. Otherwise this is the no-active-item case — commit the
   * query only when `kjFreeText` is enabled.
   */
  onEnter(e: KeyboardEvent): void {
    if (e.defaultPrevented) return;
    if (this.ctx.open() || this.ctx.allowFreeText()) {
      if (this.ctx.allowFreeText()) {
        e.preventDefault();
        this.ctx.select(this.ctx.query());
      }
    }
  }

  /** @internal */
  onEscape(e: KeyboardEvent): void {
    if (this.ctx.open()) {
      e.preventDefault();
      this.ctx.hide();
    }
  }

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }
}
