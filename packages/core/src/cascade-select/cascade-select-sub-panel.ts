import {
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { KjListNavigator } from '../primitives/list';
import { KJ_CASCADE_SELECT, nextCascadeId } from './cascade-select.context';

/**
 * Sub-panel for a single level in the cascade. Apply as a child of a
 * `[kjCascadeSelectOption]` that acts as a sub-trigger (branch node).
 *
 * Composes `KjListNavigator` (vertical + activedescendant) for the
 * generic Up/Down / Home/End / Enter / Space / type-ahead contract.
 * Cascade-specific ArrowRight (open the next-level sub-panel) and
 * ArrowLeft (close this sub-panel + focus parent) remain handled here.
 *
 * Role: `group` (descendant of the root `tree` via DOM ancestry).
 * Hidden when the owner option's sub-panel is not in the open list.
 *
 * @example
 * ```html
 * <div kjCascadeSelectOption [kjOptionValue]="'us'" kjOptionLabel="USA">
 *   <div kjCascadeSelectSubPanel>
 *     <div kjCascadeSelectOption [kjOptionValue]="'sf'" kjOptionLabel="San Francisco" />
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
  },
})
export class KjCascadeSelectSubPanel {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  /** @internal */
  readonly ctx = inject(KJ_CASCADE_SELECT);
  /** @internal — generic list navigator composed via `hostDirectives`. */
  private readonly nav = inject(KjListNavigator);

  /**
   * The id of the option element that owns / opens this sub-panel. When
   * omitted, the parent `KjCascadeSelectOption` (which queries this
   * directive via `contentChildren` and calls `setParentOptionId`)
   * supplies its auto-generated id — the typical pattern.
   */
  readonly kjOwnerOptionId = input<string | undefined>(undefined);

  /** @internal — set by the parent option when this sub-panel is registered. */
  private readonly _parentOptionId = signal<string | null>(null);

  /** @internal — resolved owner-option id (input override → parent-bound id). */
  readonly ownerOptionId = computed(
    () => this.kjOwnerOptionId() ?? this._parentOptionId() ?? '',
  );

  /** @internal — called by the parent `KjCascadeSelectOption` from its content-query effect. */
  setParentOptionId(id: string): void {
    this._parentOptionId.set(id);
  }

  constructor() {
    // Position the sub-panel relative to its parent option whenever it
    // opens. Uses `position: fixed` (set in CSS) so it escapes the root
    // panel's `overflow: auto`. Listens for scroll/resize to keep the
    // anchor accurate.
    let onResize: (() => void) | null = null;
    let onScroll: ((e: Event) => void) | null = null;

    const reposition = () => {
      const id = this._parentOptionId();
      if (!id || typeof document === 'undefined') return;
      const optEl = document.getElementById(id);
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

  /** @internal Stable panel id used in aria-owns. */
  readonly panelId = nextCascadeId('kj-cascade-sub-panel');

  /** @internal True when this panel is in the open list. */
  readonly open = computed(() =>
    this.ctx.openSubPanels().includes(this.ownerOptionId()),
  );

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
        const optEl = this.el.nativeElement.querySelector<HTMLElement>(`#${CSS.escape(activeId)}`);
        const ownerId = optEl?.getAttribute('data-owner-option-id');
        if (ownerId) this.ctx.openSubPanel(ownerId);
        return;
      }
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        this.ctx.closeSubPanel(this.ownerOptionId());
        return;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.ctx.closeSubPanel(this.ownerOptionId());
        return;
      case 'Tab':
        this.ctx.hide();
        this.ctx.closeAll();
        return;
    }
  }
}
