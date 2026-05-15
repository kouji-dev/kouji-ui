import {
  AfterContentInit,
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { KjDisabled } from '../interaction/disabled';
import { KjSelectionModel } from './selection';
import { KJ_LIST_NAVIGATOR_CONFIG } from './tokens';

let _id = 0;

/**
 * Behavior primitive for any item rendered inside a listbox / menu / tree.
 * Composes `KjDisabled`; mints a stable id; exposes value/label/haystacks;
 * binds `aria-disabled`, `aria-selected` (via injected `KjSelectionModel`),
 * `aria-posinset`/`aria-setsize` (stamped by `KjFilterableList`), and
 * `aria-keyshortcuts`. Activation (click / Enter / Space) fires an
 * `activate` output the consumer subscribes to. Role is set by the
 * consumer's outer directive — varies per cluster.
 *
 * @doc-category Core/Primitives
 */
@Directive({
  selector: '[kjListItem]',
  exportAs: 'kjListItem',
  standalone: true,
  hostDirectives: [{ directive: KjDisabled, inputs: ['kjDisabled'] }],
  host: {
    '[hidden]': '!visible()',
    '[attr.tabindex]': '"-1"',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.aria-selected]': 'ariaSelected()',
    '[attr.aria-checked]': 'ariaChecked()',
    '[attr.aria-posinset]': 'posInSet()',
    '[attr.aria-setsize]': 'setSize()',
    '[attr.aria-keyshortcuts]': 'kjShortcut() || null',
    '(click)': '_activate()',
    '(keydown.enter)': '$event.preventDefault(); _activate()',
    '(keydown.space)': '$event.preventDefault(); _activate()',
  },
})
export class KjListItem<T = unknown> implements AfterContentInit {
  /** Typed value emitted on activation. `undefined` when unset. */
  readonly kjItemValue    = input<T | undefined>(undefined);
  /** Display label. Falls back to element text content when empty. */
  readonly kjItemLabel    = input<string>('');
  /** Extra search terms merged into `haystacks` for type-ahead / filter matching. */
  readonly kjItemKeywords = input<readonly string[]>([]);
  /** ARIA keyboard shortcut string bound to `aria-keyshortcuts`. Omit to suppress the attribute. */
  readonly kjShortcut     = input<string | null>(null);

  /** Fires when the item is activated (click / Enter / Space) and not disabled. Emits `value()`. */
  readonly activate = output<T | undefined>();

  /**
   * Stable id used by `aria-activedescendant`. Resolved at construction.
   * Priority: existing host `id` attribute (static markup) → generated
   * `kj-list-item-N`. To pin an id, write `<el id="my-id" kjListItem>`.
   */
  readonly id: string;

  private readonly el = inject(ElementRef<HTMLElement>);
  readonly disabled = inject(KjDisabled).disabled;

  constructor() {
    const host = this.el.nativeElement;
    this.id = host.id || `kj-list-item-${++_id}`;
    host.id = this.id;
  }

  private readonly _elText = signal('');
  readonly value     = computed<T | undefined>(() => this.kjItemValue());
  readonly label     = computed(() => (this.kjItemLabel() || this._elText()).trim());
  readonly haystacks = computed<readonly string[]>(() => [this.label(), ...this.kjItemKeywords()]);

  private readonly _visible = signal(true);
  readonly visible = this._visible.asReadonly();
  setVisible(v: boolean): void { this._visible.set(v); }

  /**
   * Position in the visible (filter-aware) set, bound to `aria-posinset`.
   * Writable for internal use by `KjFilterableList` only; consumers
   * should treat it as read-only.
   */
  readonly posInSet = signal<number | null>(null);
  /**
   * Total size of the visible (filter-aware) set, bound to `aria-setsize`.
   * Writable for internal use by `KjFilterableList` only; consumers
   * should treat it as read-only.
   */
  readonly setSize  = signal<number | null>(null);

  private readonly selection = inject(KjSelectionModel, { optional: true }) as KjSelectionModel<T> | null;
  private readonly cfg       = inject(KJ_LIST_NAVIGATOR_CONFIG, { optional: true });

  /**
   * `aria-selected` driven by the injected selection model. `null` when
   * no model is provided, the value is undefined, or the mode is
   * `'cascade'` (which uses `aria-checked` instead, per WAI-ARIA tree).
   */
  readonly ariaSelected = computed<'true' | 'false' | null>(() => {
    if (!this.selection) return null;
    if (this.selection.mode() === 'cascade') return null;
    const v = this.value();
    if (v === undefined) return null;
    return this.selection.isSelected(v) ? 'true' : 'false';
  });

  /**
   * `aria-checked` driven by `KjSelectionModel.cascadeState()` when the
   * mode is `'cascade'`. Returns `'true'` / `'false'` / `'mixed'` per
   * the WAI-ARIA tree checkbox tri-state pattern. `null` (attribute
   * omitted) in any other mode.
   */
  readonly ariaChecked = computed<'true' | 'false' | 'mixed' | null>(() => {
    if (!this.selection || this.selection.mode() !== 'cascade') return null;
    const v = this.value();
    if (v === undefined) return null;
    return this.selection.cascadeState(v);
  });

  ngAfterContentInit(): void {
    this._elText.set(this.el.nativeElement.textContent ?? '');
  }

  _activate(): void {
    if (this.disabled()) return;
    const v = this.value();
    // Selection toggle + consumer hook live here — not in the option
    // wrapper — because every list-style cluster that wires a
    // `KjSelectionModel` repeats the same two steps after activation:
    // (1) toggle the value, (2) run consumer-specific side-effects
    // (close the overlay, set an input query, emit a commit event).
    // Centralizing both removes the per-option `activate.subscribe(...)`
    // boilerplate. `afterSelect` is invoked even when the toggle was a
    // no-op (e.g. leaf-mode branch click) so consumers can decide what
    // counts as "select" — they receive `closeRequested` to gate on.
    let closeRequested = false;
    if (this.selection && v !== undefined) {
      ({ closeRequested } = this.selection.toggle(v));
    }
    this.cfg?.afterSelect?.(v, closeRequested);
    this.activate.emit(v);
  }
}
