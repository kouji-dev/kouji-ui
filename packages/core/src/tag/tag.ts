import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  Signal,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjFocusRing } from '../primitives/interaction/focus-ring';
import { KjDisabled } from '../primitives/interaction/disabled';
import { KjSize, KjVariant, bindPresets } from '../presets';
import { KJ_TAG, KJ_TAG_LIST, KjTagContext } from './tag.context';
import { KJ_TAG_CONFIG } from './config';

/**
 * Root tag/chip directive. Renders one of four shapes from the same DOM
 * skeleton — decorative, removable, selectable, or input-chip — chosen by
 * inputs and the optional `KjTagList` container the host is rendered in.
 *
 * The host element stays element-agnostic (the wrapper picks `<button>` vs.
 * `<span>`); this directive owns the role / `tabindex` / `aria-pressed` /
 * `aria-selected` attribute decisions and the projected-text label signal
 * consumed by `KjTagRemove` to build its accessible name.
 *
 * @example
 * ```html
 * <span kjTag>Decorative</span>
 *
 * <span kjTag>
 *   Acme
 *   <button kjTagRemove>×</button>
 * </span>
 *
 * <span kjTag kjTagSelectable [(kjTagSelected)]="on">Toggle</span>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name tag
 * @doc-description Unstyled tag or chip with decorative, removable, selectable, or listbox option modes.
 * @doc-is-main
 */
@Directive({
  selector: '[kjTag]',
  standalone: true,
  providers: [
    { provide: KJ_TAG, useExisting: KjTag },
    ...bindPresets(KJ_TAG_CONFIG),
  ],
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
    { directive: KjDisabled, inputs: ['kjDisabled: kjTagDisabled'] },
    KjFocusRing,
  ],
  host: {
    '[attr.role]': 'computedRole()',
    '[attr.tabindex]': 'computedTabindex()',
    '[attr.aria-pressed]': 'computedPressed()',
    '[attr.aria-selected]': 'computedSelected()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-selected]': 'kjTagSelected() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'onClick($event)',
    '(keydown.space)': 'onActivate($event)',
    '(keydown.enter)': 'onActivate($event)',
  },
})
export class KjTag implements KjTagContext {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly list = inject(KJ_TAG_LIST, { optional: true });

  /** Enables toggle-button behaviour. Standalone selectable chips become `role="button"` + `aria-pressed`. */
  readonly kjTagSelectable = input(false);

  /** Two-way bound selection state; only meaningful when `kjTagSelectable` is true or inside a listbox container. */
  readonly kjTagSelected = model(false);

  /**
   * Optional explicit text label. When set, `KjTagRemove` reads this for its
   * auto-generated `aria-label` instead of the `MutationObserver`-derived
   * projected text content.
   */
  readonly kjTagLabel = input<string | undefined>(undefined);

  /** Disabled state, aliased through `KjDisabled` from `kjTagDisabled`. */
  readonly kjTagDisabled = input(false);

  /** Fires when this tag's projected `KjTagRemove` is activated. */
  readonly kjTagRemoved = output<void>();

  private readonly _textContent = signal('');

  /** Live projected text content. Powers `KjTagRemove`'s auto aria-label. */
  readonly textContent: Signal<string> = computed(
    () => this.kjTagLabel() ?? this._textContent(),
  );

  /** Selection state exposed via `KjTagContext` for child directives. */
  readonly selected: Signal<boolean> = this.kjTagSelected.asReadonly();

  /**
   * Effective disabled state: the tag's own `kjTagDisabled` OR the parent
   * `KjTagList`'s cascading `disabled` signal.
   */
  readonly disabled: Signal<boolean> = computed(
    () => this.kjTagDisabled() || (this.list?.disabled() ?? false),
  );

  /**
   * Role decision tree. Container wins first:
   * - `KjTagList[role="listbox"]` -> `option`
   * - `KjTagList[role="grid"]`    -> `row`
   * - else if `kjTagSelectable`   -> `button`
   * - else                        -> null (decorative).
   */
  protected readonly computedRole = computed<string | null>(() => {
    const listRole = this.list?.role();
    if (listRole === 'listbox') return 'option';
    if (listRole === 'grid') return 'row';
    if (this.kjTagSelectable()) return 'button';
    return null;
  });

  /** Focusable iff interactive (selectable, listbox option, or grid row). */
  protected readonly computedTabindex = computed<string | null>(() => {
    if (this.computedRole() === null) return null;
    return this.disabled() ? '-1' : '0';
  });

  /** `aria-pressed` only on standalone selectable chips (the toggle-button pattern). */
  protected readonly computedPressed = computed<string | null>(() => {
    if (this.list) return null;
    if (!this.kjTagSelectable()) return null;
    return this.kjTagSelected() ? 'true' : 'false';
  });

  /** `aria-selected` for chips inside a listbox container; never on grid rows / decorative. */
  protected readonly computedSelected = computed<string | null>(() => {
    if (this.list?.role() !== 'listbox') return null;
    return this.kjTagSelected() ? 'true' : 'false';
  });

  constructor() {
    afterNextRender(() => {
      // Always seed once on first render so SSR-rendered text is captured
      // immediately. The MutationObserver attaches in browsers only.
      this._textContent.set(this.el.nativeElement.textContent?.trim() ?? '');

      if (!isPlatformBrowser(this.platformId)) return;
      if (typeof MutationObserver === 'undefined') return;

      const observer = new MutationObserver(() => {
        this._textContent.set(this.el.nativeElement.textContent?.trim() ?? '');
      });
      observer.observe(this.el.nativeElement, {
        characterData: true,
        childList: true,
        subtree: true,
      });
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** @internal Click handler — toggles selection in selectable shapes only. */
  onClick(event: Event): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (this.computedRole() === 'button' || this.computedRole() === 'option') {
      this.kjTagSelected.set(!this.kjTagSelected());
    }
  }

  /** @internal Space / Enter activator — mirrors the click path; prevents page scroll on Space. */
  onActivate(event: Event): void {
    if (this.computedRole() === null) return;
    if (this.disabled()) return;
    event.preventDefault();
    if (this.computedRole() === 'button' || this.computedRole() === 'option') {
      this.kjTagSelected.set(!this.kjTagSelected());
    }
  }

  /**
   * Triggers removal. Called from a projected `KjTagRemove`. Re-emitted as
   * `(kjTagRemoved)` for the consumer to drop this chip from their model.
   */
  remove(): void {
    if (this.disabled()) return;
    this.kjTagRemoved.emit();
  }
}
