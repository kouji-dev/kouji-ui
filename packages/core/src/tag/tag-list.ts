import {
  Directive,
  ElementRef,
  PLATFORM_ID,
  Signal,
  computed,
  contentChildren,
  effect,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { KjRovingTabindex } from '../a11y/roving-tabindex';
import { KjTag } from './tag';
import { KJ_TAG_LIST, KjTagListContext, KjTagListRole } from './tag.context';

/**
 * Optional container that coordinates a group of `KjTag` chips. Provides
 * the chip-group keyboard story (roving tabindex via `KjRovingTabindex`),
 * the ARIA wiring for the `listbox` / `grid` / `group` shapes, and — with
 * `kjMax` — collapses the chips past the cap: they get `[hidden]` and
 * `data-overflow`, and `overflowCount` / `hiddenLabels` let a wrapper render
 * a "+N" chip that reveals them.
 *
 * Standalone tags work fine without this container — the container is the
 * opt-in surface that turns a pile of independent chips into a single
 * keyboardable composite.
 *
 * @example
 * ```html
 * <div kjTagList kjTagListRole="listbox" [kjTagListMultiple]="true" aria-label="Filters">
 *   <span kjTag kjTagSelectable>One</span>
 *   <span kjTag kjTagSelectable>Two</span>
 * </div>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name tag
 */
@Directive({
  selector: '[kjTagList]',
  standalone: true,
  providers: [{ provide: KJ_TAG_LIST, useExisting: KjTagList }],
  hostDirectives: [
    { directive: KjRovingTabindex, inputs: ['kjRovingOrientation: kjTagListOrientation'] },
  ],
  host: {
    '[attr.role]': 'kjTagListRole()',
    '[attr.aria-orientation]': 'ariaOrientation()',
    '[attr.aria-multiselectable]': 'ariaMultiSelectable()',
    '[attr.aria-disabled]': 'kjTagListDisabled() ? "true" : null',
    '[attr.tabindex]': 'kjTagListRole() !== "group" ? "-1" : null',
  },
})
export class KjTagList implements KjTagListContext {
  private readonly platformId = inject(PLATFORM_ID);

  /** Container ARIA role — drives chip role selection (option / row / none). */
  readonly kjTagListRole = input<KjTagListRole>('group');

  /** Roving tabindex axis. Forwarded to `KjRovingTabindex`. */
  readonly kjTagListOrientation = input<'horizontal' | 'vertical' | 'both'>('horizontal');

  /** Only meaningful in `listbox` mode. Drives `aria-multiselectable`. */
  readonly kjTagListMultiple = input(false);

  /** Cascading disabled flag. Each chip's effective disabled OR-merges this. */
  readonly kjTagListDisabled = input(false);

  /**
   * Maximum number of chips shown before the rest collapse. Chips past this
   * index are hidden (`[hidden]` + `data-overflow`) and counted in
   * `overflowCount`. `0` disables the cap (show everything).
   * @default 0
   */
  readonly kjMax = input<number>(0);

  /** Read-only role view used by `KjTag` to compute its own role. */
  readonly role: Signal<KjTagListRole> = this.kjTagListRole;

  /** Read-only disabled view used by `KjTag` to merge into its effective disabled. */
  readonly disabled: Signal<boolean> = this.kjTagListDisabled;

  /** Read-only multi-selectable view (listbox-only meaning). */
  readonly multiple: Signal<boolean> = this.kjTagListMultiple;

  /**
   * Every projected `KjTag` (including those composed via `hostDirectives`
   * on a wrapper). `descendants: true` so a chip wrapped in an anchor or a
   * form control still counts.
   */
  private readonly tags = contentChildren(KjTag, { descendants: true });
  private readonly tagHosts = contentChildren(KjTag, { descendants: true, read: ElementRef });

  /** Projected chip count. */
  readonly total: Signal<number> = computed(() => this.tags().length);

  /** Number of chips rendered visibly (the rest are `[hidden]`). */
  readonly visibleCount: Signal<number> = computed(() => {
    const max = this.kjMax();
    const count = this.tags().length;
    return max <= 0 ? count : Math.min(count, max);
  });

  /** Number of chips collapsed by the cap. `0` when nothing overflows. */
  readonly overflowCount: Signal<number> = computed(() =>
    Math.max(0, this.total() - this.visibleCount()),
  );

  /** Labels of the collapsed chips, in order — the wrapper's default panel content. */
  readonly hiddenLabels: Signal<readonly string[]> = computed(() =>
    this.tags()
      .slice(this.visibleCount())
      .map((t) => t.textContent()),
  );

  /** Only emit `aria-orientation` when the container has a real role. */
  protected readonly ariaOrientation = computed<string | null>(() => {
    if (this.kjTagListRole() === 'group') return null;
    return this.kjTagListOrientation() === 'both' ? 'horizontal' : this.kjTagListOrientation();
  });

  /** `aria-multiselectable` only set in listbox mode. */
  protected readonly ariaMultiSelectable = computed<string | null>(() => {
    if (this.kjTagListRole() !== 'listbox') return null;
    return this.kjTagListMultiple() ? 'true' : 'false';
  });

  constructor() {
    // Same contract as `KjAvatarGroup`: the group owns the visibility of its
    // collapsed chips and writes it onto their host elements.
    effect(() => {
      const hosts = this.tagHosts();
      const cap = this.visibleCount();
      const capped = this.kjMax() > 0;
      if (!isPlatformBrowser(this.platformId)) return;
      hosts.forEach((ref, index) => {
        const el = ref.nativeElement as HTMLElement | null;
        if (!el) return;
        if (capped && index >= cap) {
          el.setAttribute('hidden', '');
          el.setAttribute('data-overflow', 'true');
        } else {
          el.removeAttribute('hidden');
          el.removeAttribute('data-overflow');
        }
      });
    });
  }
}
