import { Directive, Signal, computed, input } from '@angular/core';
import { KjRovingTabindex } from '../a11y/roving-tabindex';
import { KJ_TAG_LIST, KjTagListContext, KjTagListRole } from './tag.context';

/**
 * Optional container that coordinates a group of `KjTag` chips. Provides
 * the chip-group keyboard story (roving tabindex via `KjRovingTabindex`)
 * and the ARIA wiring for the `listbox` / `grid` / `group` shapes called
 * out in the analysis.
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
 * @category Core/Data display
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
  /** Container ARIA role — drives chip role selection (option / row / none). */
  readonly kjTagListRole = input<KjTagListRole>('group');

  /** Roving tabindex axis. Forwarded to `KjRovingTabindex`. */
  readonly kjTagListOrientation = input<'horizontal' | 'vertical' | 'both'>('horizontal');

  /** Only meaningful in `listbox` mode. Drives `aria-multiselectable`. */
  readonly kjTagListMultiple = input(false);

  /** Cascading disabled flag. Each chip's effective disabled OR-merges this. */
  readonly kjTagListDisabled = input(false);

  /** Read-only role view used by `KjTag` to compute its own role. */
  readonly role: Signal<KjTagListRole> = this.kjTagListRole;

  /** Read-only disabled view used by `KjTag` to merge into its effective disabled. */
  readonly disabled: Signal<boolean> = this.kjTagListDisabled;

  /** Read-only multi-selectable view (listbox-only meaning). */
  readonly multiple: Signal<boolean> = this.kjTagListMultiple;

  /** Only emit `aria-orientation` when the container has a real role. */
  protected readonly ariaOrientation = computed<string | null>(() => {
    if (this.kjTagListRole() === 'group') return null;
    return this.kjTagListOrientation() === 'both'
      ? 'horizontal'
      : this.kjTagListOrientation();
  });

  /** `aria-multiselectable` only set in listbox mode. */
  protected readonly ariaMultiSelectable = computed<string | null>(() => {
    if (this.kjTagListRole() !== 'listbox') return null;
    return this.kjTagListMultiple() ? 'true' : 'false';
  });
}
