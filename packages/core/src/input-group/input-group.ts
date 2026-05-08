import {
  Directive,
  Signal,
  WritableSignal,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { KjDisabled } from '../primitives/interaction/disabled';
import { KjSize } from '../presets/size';
import { KjVariant } from '../presets/variant';
import { KJ_INPUT_GROUP, KjInputGroupContext } from './input-group.context';

/** Internal shape stored in the addon registry. */
interface AddonEntry {
  id: string;
  position: Signal<'start' | 'end' | 'auto'>;
  isDecorative: Signal<boolean>;
}

/**
 * Coordinates a group of `[kjInputGroupAddon]` elements flanking a central
 * `[kjInput]`. Provides the `KJ_INPUT_GROUP` context token, propagates
 * variant/size/disabled to children, and builds the `startAddonIds` /
 * `endAddonIds` lists used to compose `aria-labelledby` on the inner input.
 *
 * The directive is structural-only: it does not render any DOM of its own.
 * Visual concerns live in `packages/components/src/input-group/`.
 *
 * @example
 * ```html
 * <div kjInputGroup [kjOrientation]="'horizontal'">
 *   <span kjInputGroupAddon>$</span>
 *   <input kjInput type="text" placeholder="Amount" />
 *   <span kjInputGroupAddon kjPosition="end">.00</span>
 * </div>
 * ```
 * @category Core/Inputs
 * @doc
 * @doc-name input-group
 * @doc-description Groups an input with prefix and suffix addons that share variant, size, and disabled state.
 * @doc-is-main
 */
@Directive({
  selector: '[kjInputGroup]',
  standalone: true,
  exportAs: 'kjInputGroup',
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
    { directive: KjDisabled, inputs: ['kjDisabled'] },
  ],
  providers: [{ provide: KJ_INPUT_GROUP, useExisting: KjInputGroup }],
  host: {
    '[attr.data-orientation]': 'kjOrientation()',
    '[attr.data-disabled]': 'aggregateDisabled() ? "" : null',
  },
})
export class KjInputGroup implements KjInputGroupContext {
  private readonly _variantDir = inject(KjVariant);
  private readonly _sizeDir = inject(KjSize);
  private readonly _disabledDir = inject(KjDisabled);

  /** Layout axis for the group. */
  readonly kjOrientation = input<'horizontal' | 'vertical'>('horizontal');

  /** Disabled input (forwarded from `KjDisabled`). */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  // ── Addon registry ──────────────────────────────────────────────────────
  private readonly _addons: WritableSignal<readonly AddonEntry[]> = signal([]);

  /** Ids of addons positioned at the start of the group. */
  readonly startAddonIds: Signal<readonly string[]> = computed(() =>
    this._addons()
      .filter(a => {
        const pos = a.position();
        return pos === 'start' || (pos === 'auto' && this._addons().indexOf(a) < this._firstNonStartIndex());
      })
      .filter(a => !a.isDecorative())
      .map(a => a.id),
  );

  /** Ids of addons positioned at the end of the group. */
  readonly endAddonIds: Signal<readonly string[]> = computed(() =>
    this._addons()
      .filter(a => {
        const pos = a.position();
        return pos === 'end' || (pos === 'auto' && this._addons().indexOf(a) >= this._firstNonStartIndex());
      })
      .filter(a => !a.isDecorative())
      .map(a => a.id),
  );

  // ── KjInputGroupContext ──────────────────────────────────────────────────
  readonly grouped = true as const;

  get variant(): Signal<string | undefined> {
    return this._variantDir.kjVariant as Signal<string | undefined>;
  }

  get size(): Signal<string | undefined> {
    return this._sizeDir.kjSize as Signal<string | undefined>;
  }

  get disabled(): Signal<boolean> {
    return this._disabledDir.disabled;
  }

  /** OR of own disabled flag. Exposed for host bindings and children. */
  readonly aggregateDisabled = computed(() => this._disabledDir.disabled());

  registerAddon(addon: AddonEntry): void {
    this._addons.update(prev => [...prev, addon]);
  }

  unregisterAddon(id: string): void {
    this._addons.update(prev => prev.filter(a => a.id !== id));
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Returns the index of the first addon whose `position` signal is not
   * `'start'` — used as the boundary between start and end in `'auto'` mode.
   */
  private _firstNonStartIndex(): number {
    const addons = this._addons();
    for (let i = 0; i < addons.length; i++) {
      if (addons[i].position() !== 'start') return i;
    }
    return addons.length;
  }
}
