import {
  Injector,
  afterNextRender,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { KjListNavigator } from '../primitives/list';
import {
  KJ_LIST_FOCUS_MODE_DEFAULT,
  KJ_LIST_NAVIGATOR_ITEMS,
} from '../primitives/list/navigator';
import { nextCascadeId } from './cascade-select.context';
import { KjCascadeSelect } from './cascade-select-root';
import { KjCascadeSelectOption } from './cascade-select-option';
import { DOCUMENT } from '@angular/common';

/**
 * Sub-panel for a single level in the cascade. Apply as a child of a
 * `[kjCascadeSelectOption]` that acts as a sub-trigger (branch node).
 *
 * Composes `KjListNavigator` (vertical, roving focus) for the generic
 * Up/Down / Home/End / Enter / Space contract over *this level's* options
 * only. Cascade-specific ArrowRight (open the next-level sub-panel and
 * focus its first option) and ArrowLeft (close this sub-panel and return
 * focus to the owning option) remain handled here.
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
      inputs: ['kjOrientation'],
    },
  ],
  providers: [
    // Options are the focus targets (APG tree: roving tabindex).
    { provide: KJ_LIST_FOCUS_MODE_DEFAULT, useValue: 'roving' as const },
    // The root config's `items` spans every level; this navigator walks
    // only the options projected into this sub-panel.
    {
      provide: KJ_LIST_NAVIGATOR_ITEMS,
      useFactory: () => {
        const root = inject(KjCascadeSelect);
        const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
        return root.itemsAtLevel(host);
      },
    },
  ],
  host: {
    'role': 'group',
    'tabindex': '-1',
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
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
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

  /** @internal Host element — the key `KjCascadeSelect.itemsAtLevel` scopes options by. */
  get hostEl(): HTMLElement {
    return this.el.nativeElement;
  }

  /** @internal True when this panel is in the open list. */
  readonly open = computed(() =>
    this.root.openSubPanels().includes(this.ownerOptionId()),
  );

  constructor() {
    // Position the sub-panel relative to its parent option while it is
    // open. Uses `position: fixed` (set in CSS) so it escapes the root
    // panel's `overflow: auto`. Scroll / resize re-anchor it, coalesced
    // to one layout read + write per frame and registered passively so
    // they never block scrolling. The effect's cleanup runs on every
    // re-run *and* on destroy, so a sub-panel torn down while open (root
    // overlay closing, route change) leaves no window listener behind.
    const reposition = () => {
      const optEl = this.parentOption?.item._host();
      if (!optEl) return;
      const rect = optEl.getBoundingClientRect();
      const el = this.el.nativeElement;
      el.style.top = `${rect.top}px`;
      el.style.left = `${rect.right + 2}px`;
    };

    effect(onCleanup => {
      const view = this.document.defaultView;
      if (!view || !this.open()) return;
      let frame = 0;
      const schedule = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          reposition();
        });
      };
      reposition();
      view.addEventListener('resize', schedule, { passive: true });
      view.addEventListener('scroll', schedule, { capture: true, passive: true });
      onCleanup(() => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        view.removeEventListener('resize', schedule);
        view.removeEventListener('scroll', schedule, true);
      });
    });
  }

  /**
   * @internal Land the roving focus on this level's first option once the
   * panel is rendered open (ArrowRight / Enter / Space on the owning
   * branch). A hover-open never calls this — pointer users keep their
   * focus where it is.
   */
  _focusFirst(): void {
    afterNextRender(() => {
      if (!this.open()) return;
      this.nav.moveToFirst();
      this.nav.focusActive();
    }, { injector: this.injector });
  }

  /**
   * @internal Cascade-specific keys — ArrowRight opens the active
   * branch's nested sub-panel and focuses its first option; ArrowLeft
   * closes this sub-panel and returns focus to the owning option (whose
   * panel re-syncs its active row from the `focusin`); Escape dismisses
   * this level (the overlay stack, which sees the key first, dismisses
   * the whole cascade); Tab dismisses everything and hands focus back to
   * the trigger via the root panel. Up/Down / Home/End / Enter / Space
   * are owned by the composed `KjListNavigator`.
   */
  onKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const activeId = this.nav.activeId();
        if (!activeId) return;
        const option = this.root.findOption(activeId);
        if (!option?.isBranch()) return;
        this.root.openSubPanel(option.item.id);
        option.subPanel()?._focusFirst();
        return;
      }
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        this.root.closeSubPanel(this.ownerOptionId());
        this.parentOption?.item._host().focus();
        return;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.root.closeSubPanel(this.ownerOptionId());
        return;
      case 'Tab':
        this.root.closeAll();
        return;
    }
  }
}
