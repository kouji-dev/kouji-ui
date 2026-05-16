import {
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { KjListNavigator } from '../primitives/list';
import { nextCascadeId } from './cascade-select.context';
import { KjCascadeSelect } from './cascade-select-root';
import { KjCascadeSelectOption } from './cascade-select-option';

/**
 * Sub-panel for a single level in the cascade. Apply as a child of a
 * `[kjCascadeSelectOption]` that acts as a sub-trigger (branch node).
 *
 * Composes `KjListNavigator` (vertical + activedescendant) for the
 * generic Up/Down / Home/End / Enter / Space / type-ahead contract.
 * Cascade-specific ArrowRight (open the next-level sub-panel) and
 * ArrowLeft (close this sub-panel + focus parent) remain handled here.
 *
 * Resolves its parent `KjCascadeSelectOption` through Angular DI — no
 * `document.getElementById` / `setParentOptionId` plumbing. The
 * sub-panel reads the parent's auto-generated `KjListItem.id` for its
 * `aria-labelledby` and uses the parent's host element directly for
 * fixed-position anchoring.
 *
 * @example
 * ```html
 * <div kjCascadeSelectOption [kjValue]="'us'" kjLabel="USA">
 *   <div kjCascadeSelectSubPanel>
 *     <div kjCascadeSelectOption [kjValue]="'sf'" kjLabel="San Francisco" />
 *   </div>
 * </div>
 * ```
 * @doc-category Core/Data input
 * @doc
 * @doc-name cascade-select
 */
@Directive({
  selector: '[kjCascadeSelectSubPanel]',
  standalone: true,
  hostDirectives: [
    {
      directive: KjListNavigator,
      inputs: ['kjOrientation', 'kjFocusMode'],
    },
  ],
  host: {
    'role': 'group',
    'tabindex': '-1',
    'kjOrientation': 'vertical',
    'kjFocusMode': 'activedescendant',
    '[id]': 'panelId',
    '[attr.hidden]': '!open() ? "" : null',
    '[attr.aria-labelledby]': 'ownerOptionId()',
    '(keydown)': 'onKeydown($event)',
    '(click)': '$event.stopPropagation()',
    '(mouseenter)': 'parentOption?._cancelCloseTimer()',
    '(mouseleave)': 'parentOption?._scheduleClose()',
  },
})
export class KjCascadeSelectSubPanel {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  /** @internal — root cascade-select (sub-panel state + option lookup). */
  private readonly root = inject(KjCascadeSelect);
  /** @internal — generic list navigator composed via `hostDirectives`. */
  private readonly nav = inject(KjListNavigator);
  /**
   * @internal Parent option directive resolved via the element
   * injector — `[kjCascadeSelectSubPanel]` is always declared as a
   * content child of `[kjCascadeSelectOption]`, so Angular walks the
   * host hierarchy and finds it without an explicit registration call.
   * Not `private` because the host hover bindings reference it.
   */
  readonly parentOption = inject(KjCascadeSelectOption, { optional: true });

  /**
   * Override the parent-option id for `aria-labelledby` (rare —
   * typically the parent option's auto-minted `KjListItem.id` is the
   * right target).
   */
  readonly kjOwnerOptionId = input<string | undefined>(undefined);

  /** @internal — resolved owner-option id (input override → parent's KjListItem id). */
  readonly ownerOptionId = computed(
    () => this.kjOwnerOptionId() ?? this.parentOption?.item.id ?? '',
  );

  /** @internal Stable panel id used in `aria-owns`. */
  readonly panelId = nextCascadeId('kj-cascade-sub-panel');

  /** @internal True when this panel is in the open list. */
  readonly open = computed(() =>
    this.root.openSubPanels().includes(this.ownerOptionId()),
  );

  constructor() {
    // Position the sub-panel relative to its parent option whenever it
    // opens. Uses `position: fixed` (set in CSS) so it escapes the root
    // panel's `overflow: auto`. Listens for scroll/resize to keep the
    // anchor accurate. Parent element comes from DI (KjCascadeSelectOption)
    // — no `document.getElementById` lookup.
    let onResize: (() => void) | null = null;
    let onScroll: ((e: Event) => void) | null = null;

    const reposition = () => {
      const optEl = this.parentOption?.item._host();
      if (!optEl) return;
      const rect = optEl.getBoundingClientRect();
      const el = this.el.nativeElement;
      el.style.top = `${rect.top}px`;
      el.style.left = `${rect.right + 2}px`;
    };

    effect(() => {
      if (typeof window === 'undefined') return;
      const isOpen = this.open();
      if (isOpen) {
        reposition();
        onResize = reposition;
        onScroll = () => reposition();
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll, true);
      } else {
        if (onResize) window.removeEventListener('resize', onResize);
        if (onScroll) window.removeEventListener('scroll', onScroll, true);
        onResize = onScroll = null;
      }
    });
  }

  /**
   * @internal Cascade-specific keys — ArrowRight opens the active
   * branch's nested sub-panel; ArrowLeft closes this sub-panel and
   * pops the active focus back to the parent panel; Escape / Tab
   * dismiss this level (or all levels at depth 1). Up/Down / Home/End
   * / Enter / Space / typeahead are owned by the composed
   * `KjListNavigator`.
   */
  onKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const activeId = this.nav.activeId();
        if (!activeId) return;
        const option = this.root.findOption(activeId);
        if (option?.isBranch()) this.root.openSubPanel(option.item.id);
        return;
      }
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        this.root.closeSubPanel(this.ownerOptionId());
        return;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.root.closeSubPanel(this.ownerOptionId());
        return;
      case 'Tab':
        this.root.hide();
        this.root.closeAll();
        return;
    }
  }
}
