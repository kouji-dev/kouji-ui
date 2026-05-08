import {
  afterNextRender,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { KjDisabled, KjFocusRing } from '../primitives';
import { KJ_SELECT } from './select.context';

/**
 * Root select container. Manages open/close state via `kjSelectValue` model.
 *
 * @example
 * ```html
 * <div kjSelect [(kjSelectValue)]="selected">
 *   <button kjSelectTrigger aria-haspopup="listbox">Choose fruit</button>
 *   <div kjSelectContent>
 *     <div kjOption [kjOptionValue]="'apple'">Apple</div>
 *   </div>
 * </div>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name select
 * @doc-is-main
 */
@Directive({
  selector: '[kjSelect]',
  standalone: true,
  providers: [{ provide: KJ_SELECT, useExisting: KjSelect }],
})
export class KjSelect {
  /** The currently selected value. Supports two-way binding. */
  readonly kjSelectValue = model<unknown>(undefined);

  /** Read-only signal for the current value. */
  readonly value = this.kjSelectValue.asReadonly();

  private readonly _open = signal(false);

  /** Whether the listbox is currently open. */
  readonly open = this._open.asReadonly();

  /**
   * Selects a value and closes the listbox.
   * @param val The value to select.
   */
  select(val: unknown): void {
    this.kjSelectValue.set(val);
    this._open.set(false);
  }

  /** Toggles the open state of the listbox. */
  toggle(): void {
    this._open.update(v => !v);
  }

  /** Closes the listbox. */
  hide(): void {
    this._open.set(false);
  }
}

/**
 * Trigger button that opens/closes the select listbox.
 * Automatically binds `aria-expanded` to reflect open state.
 *
 * @example
 * ```html
 * <button kjSelectTrigger aria-haspopup="listbox">Choose fruit</button>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name select
 */
@Directive({
  selector: '[kjSelectTrigger]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '(click)': '$event.stopPropagation(); ctx.toggle()',
  },
})
export class KjSelectTrigger {
  /** @internal */
  readonly ctx = inject(KJ_SELECT);
}

/**
 * Listbox container. Provides keyboard navigation (Arrow keys, Home, End,
 * Enter, Space, type-ahead) and ARIA listbox semantics. Hidden when closed.
 *
 * @example
 * ```html
 * <div kjSelectContent>
 *   <div kjOption [kjOptionValue]="'apple'">Apple</div>
 * </div>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name select
 */
@Directive({
  selector: '[kjSelectContent]',
  standalone: true,
  host: {
    'role': 'listbox',
    '[attr.hidden]': '!ctx.open() ? "" : null',
    '[attr.aria-activedescendant]': 'activeId()',
    '(keydown)': 'onKeydown($event)',
    '(document:keydown.escape)': 'ctx.hide()',
    '(document:click)': 'onDocClick()',
    '(click)': '$event.stopPropagation()',
  },
})
export class KjSelectContent {
  private readonly el = inject(ElementRef<HTMLElement>);
  /** @internal */
  readonly ctx = inject(KJ_SELECT);

  private readonly _activeIndex = signal(-1);

  /** @internal */
  readonly activeId = computed(() => {
    const items = this.getOptions();
    const idx = this._activeIndex();
    return items[idx]?.id ?? null;
  });

  /** @internal */
  onDocClick(): void {
    if (this.ctx.open()) this.ctx.hide();
  }

  /** @internal */
  onKeydown(e: KeyboardEvent): void {
    const items = this.getOptions();
    if (!items.length) return;
    let idx = this._activeIndex();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        idx = Math.min(idx + 1, items.length - 1);
        this._activeIndex.set(idx);
        items[idx]?.el.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        idx = Math.max(idx - 1, 0);
        this._activeIndex.set(idx);
        items[idx]?.el.focus();
        break;
      case 'Home':
        e.preventDefault();
        this._activeIndex.set(0);
        items[0]?.el.focus();
        break;
      case 'End':
        e.preventDefault();
        this._activeIndex.set(items.length - 1);
        items[items.length - 1]?.el.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (idx >= 0) {
          const val = items[idx]?.value;
          if (val !== undefined) this.ctx.select(val);
        }
        break;
      default: {
        const char = e.key.length === 1 ? e.key.toLowerCase() : null;
        if (char) {
          const match = items.findIndex(item =>
            item.el.textContent?.trim().toLowerCase().startsWith(char)
          );
          if (match >= 0) {
            this._activeIndex.set(match);
            items[match].el.focus();
          }
        }
      }
    }
  }

  private getOptions(): Array<{ el: HTMLElement; value: unknown; id: string }> {
    return (Array.from(
      this.el.nativeElement.querySelectorAll('[kjOption]')
    ) as HTMLElement[]).map((el, i) => ({
      el,
      value: (el as HTMLElement & { __kjOptionValue?: unknown }).__kjOptionValue,
      id: el.id || `kj-option-${i}`,
    }));
  }
}

/**
 * Individual option inside a `kjSelectContent`. Clicking or pressing Enter/Space
 * calls `select()` on the parent context.
 *
 * @example
 * ```html
 * <div kjOption [kjOptionValue]="'apple'">Apple</div>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name select
 */
@Directive({
  selector: '[kjOption]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
  ],
  host: {
    'role': 'option',
    '[attr.tabindex]': '"0"',
    '[attr.aria-selected]': 'selected().toString()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '(click)': 'handleClick()',
    '(keydown.enter)': '$event.preventDefault(); handleClick()',
    '(keydown.space)': '$event.preventDefault(); handleClick()',
  },
})
export class KjOption {
  private readonly ctx = inject(KJ_SELECT);
  private readonly el = inject(ElementRef<HTMLElement>);
  /** @internal */
  readonly disabled = inject(KjDisabled).disabled;

  /** The value this option represents. */
  readonly kjOptionValue = input.required<unknown>();

  /** @internal */
  readonly selected = computed(() => this.ctx.value() === this.kjOptionValue());

  constructor() {
    effect(() => {
      (this.el.nativeElement as HTMLElement & { __kjOptionValue?: unknown }).__kjOptionValue = this.kjOptionValue();
    });
    afterNextRender(() => {
      if (!this.el.nativeElement.id) {
        this.el.nativeElement.id = `kj-option-${Math.random().toString(36).slice(2, 7)}`;
      }
    });
  }

  /** @internal */
  handleClick(): void {
    if (!this.disabled()) this.ctx.select(this.kjOptionValue());
  }
}
