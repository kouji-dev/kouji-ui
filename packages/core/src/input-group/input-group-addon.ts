import {
  DestroyRef,
  Directive,
  Signal,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { KJ_INPUT_GROUP } from './input-group.context';

/** Auto-incrementing counter for stable addon ids. */
let _nextId = 0;

/**
 * Marks an element as a prefix or suffix addon inside a `[kjInputGroup]`.
 *
 * Auto-mints a stable `id` (e.g. `kj-addon-0`) so the parent group can build
 * `aria-labelledby` lists. Registers with the group on construction and
 * deregisters on destroy.
 *
 * - `kjPosition='start'` — always treated as a leading addon.
 * - `kjPosition='end'`   — always treated as a trailing addon.
 * - `kjPosition='auto'`  — inferred from DOM order (default).
 *
 * Set `kjAriaHidden="true"` (or omit) to mark decorative addons (icons,
 * currency symbols, etc.) that do not need to participate in
 * `aria-labelledby`.
 *
 * @example
 * ```html
 * <span kjInputGroupAddon>$</span>
 * <input kjInput type="text" placeholder="Amount" />
 * <span kjInputGroupAddon kjPosition="end">.00</span>
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name input-group
 */
@Directive({
  selector: '[kjInputGroupAddon]',
  standalone: true,
  exportAs: 'kjInputGroupAddon',
  host: {
    '[id]': 'addonId',
    '[attr.aria-hidden]': 'kjAriaHidden() != null ? (kjAriaHidden() ? "true" : null) : null',
    '[attr.data-position]': 'kjPosition()',
  },
})
export class KjInputGroupAddon {
  private readonly _group = inject(KJ_INPUT_GROUP, { optional: true });
  private readonly _destroyRef = inject(DestroyRef);

  /** Stable id for this addon — set once at construction time. */
  readonly addonId = `kj-addon-${_nextId++}`;

  /**
   * Explicit position override. When `'auto'` (default), position is inferred
   * from DOM order within the group.
   */
  readonly kjPosition = input<'start' | 'end' | 'auto'>('auto');

  /**
   * When `true`, marks this addon as decorative (`aria-hidden="true"`).
   * When `false`, ensures the element is not hidden.
   * When `undefined` (default), no `aria-hidden` attribute is written.
   */
  readonly kjAriaHidden = input<boolean | undefined, boolean | string | undefined>(undefined, {
    transform: (v: boolean | string | undefined): boolean | undefined => {
      if (v === undefined || v === '') return undefined;
      return booleanAttribute(v);
    },
  });

  /** `true` when this addon should be excluded from `aria-labelledby` composition. */
  readonly isDecorative: Signal<boolean> = computed(() => this.kjAriaHidden() === true);

  constructor() {
    if (this._group) {
      const group = this._group;
      const id = this.addonId;
      const position = this.kjPosition;
      const isDecorative = this.isDecorative;

      group.registerAddon({ id, position, isDecorative });

      this._destroyRef.onDestroy(() => {
        group.unregisterAddon(id);
      });
    }
  }
}
