import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

/**
 * Radio-group keyboard behaviour for options that are buttons: arrow keys,
 * Home / End and a single Tab stop over a `role="radiogroup"` whose options
 * carry `kjButton` (or any other directive) — without adding a directive to
 * the options themselves.
 *
 * `[kjRadio]` composes `KjFocusRing` and `KjDisabled`, as `kjButton` does, so
 * the two cannot share an element (Angular's NG0309) and would both write
 * `aria-disabled`. `kjRadioKeys` sits on the group instead and composes
 * nothing: each option keeps its own `role="radio"`, `aria-checked` and
 * `(click)`, and its directives keep their focus ring and disabled state.
 *
 * Right / Down pick the next enabled option, Left / Up the previous one
 * (swapped under `dir="rtl"`), wrapping at the ends; Home / End pick the first
 * / last. Picking is a `click()` on the option, so the option's own `(click)`
 * stays the one way the value changes, then the focus moves to it — the
 * WAI-ARIA radio group pattern, where the selection follows the focus.
 *
 * The group is one Tab stop: the checked option has `tabindex="0"` (or the
 * first enabled one, when nothing is checked) and every other option `-1`. The
 * tab stop follows `aria-checked`, `disabled` and `aria-disabled` and options
 * added or removed, from a `MutationObserver` on the group.
 *
 * @example
 * ```html
 * <div role="radiogroup" aria-label="View" kjRadioKeys>
 *   <button kjButton type="button" role="radio" [attr.aria-checked]="view() === 'list'" (click)="view.set('list')">List</button>
 *   <button kjButton type="button" role="radio" [attr.aria-checked]="view() === 'grid'" (click)="view.set('grid')">Grid</button>
 * </div>
 * ```
 *
 * @doc-keyboard
 *   ArrowRight|ArrowDown — Picks and focuses the next enabled option (wraps)
 *   ArrowLeft|ArrowUp    — Picks and focuses the previous enabled option (wraps)
 *   Home|End             — Picks and focuses the first / last enabled option
 *   Tab                  — Enters the group once, on the checked option
 *
 * @doc-aria
 *   role="radiogroup" — Set by the consumer on the host, with an accessible name
 *   role="radio"      — Set by the consumer on each option (or on a mark inside it, see `kjRadioKeys`)
 *   aria-checked      — Set by the consumer; read to seat the tab stop
 *   tabindex          — Owned by the directive: 0 on the tab stop, -1 on the rest
 *
 * @doc-a11y
 *   Limits: the directive does not hold the value or write `aria-checked` —
 *   bind it on each option. A disabled option (native `disabled` or
 *   `aria-disabled="true"`) is skipped by the keys and never the tab stop.
 *   Modified arrows (Shift, Ctrl, Alt, Meta) are left to the page. Options are
 *   found with `querySelectorAll`, so a nested radio group inside an option
 *   would be read as part of this one.
 *
 * @doc-category Core/Inputs
 * @doc
 * @doc-name radio
 * @doc-description Arrow keys and one Tab stop for a radio group whose options are kjButton elements.
 */
@Directive({
  selector: '[kjRadioKeys]',
  standalone: true,
  exportAs: 'kjRadioKeys',
  host: { '(keydown)': 'onKeydown($event)' },
})
export class KjRadioKeys {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * CSS selector of the options, for rows that wrap a presentational
   * `role="radio"` mark. Empty (default) means the group's `[role=radio]` elements.
   */
  readonly kjRadioKeys = input('');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.seatTabStop();
      const observer = new MutationObserver(() => this.seatTabStop());
      observer.observe(this.host, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['aria-checked', 'aria-disabled', 'disabled'],
      });
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** @internal Moves the pick on an arrow / Home / End key. @param e The keydown event. */
  onKeydown(e: KeyboardEvent): void {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const rtl = this.host.closest('[dir]')?.getAttribute('dir')?.toLowerCase() === 'rtl';
    const step =
      e.key === 'ArrowDown' || e.key === (rtl ? 'ArrowLeft' : 'ArrowRight') ? 1
        : e.key === 'ArrowUp' || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft') ? -1
          : 0;
    if (!step && e.key !== 'Home' && e.key !== 'End') return;
    const opts = this.options().filter(isEnabled);
    const n = opts.length;
    if (!n) return;
    // From the option the key was pressed in; a composed roving tabindex may
    // already have moved the focus elsewhere by the time the event reaches us.
    let at = opts.findIndex((o) => o.contains(e.target as Node | null));
    if (at < 0) at = opts.findIndex(isChecked);
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : at < 0 ? 0 : (at + step + n) % n;
    e.preventDefault();
    opts[to].click();
    opts[to].focus();
  }

  private options(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>(this.kjRadioKeys() || '[role=radio]'));
  }

  private seatTabStop(): void {
    const opts = this.options();
    const enabled = opts.filter(isEnabled);
    const stop = enabled.find(isChecked) ?? enabled[0];
    for (const o of opts) {
      const value = o === stop ? '0' : '-1';
      if (o.getAttribute('tabindex') !== value) o.setAttribute('tabindex', value);
    }
  }
}

function isEnabled(o: HTMLElement): boolean {
  return !(o as HTMLButtonElement).disabled && o.getAttribute('aria-disabled') !== 'true';
}

function isChecked(o: HTMLElement): boolean {
  return o.getAttribute('aria-checked') === 'true' || !!o.querySelector('[role=radio][aria-checked=true]');
}
