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
    '[id]': 'id',
    '[hidden]': '!visible()',
    '[attr.tabindex]': '"-1"',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.aria-selected]': 'ariaSelected()',
    '[attr.aria-posinset]': 'posInSet()',
    '[attr.aria-setsize]': 'setSize()',
    '[attr.aria-keyshortcuts]': 'kjShortcut() || null',
    '(click)': '_activate()',
    '(keydown.enter)': '$event.preventDefault(); _activate()',
    '(keydown.space)': '$event.preventDefault(); _activate()',
  },
})
export class KjListItem<T = unknown> implements AfterContentInit {
  readonly kjItemValue    = input<T | undefined>(undefined);
  readonly kjItemLabel    = input<string>('');
  readonly kjItemKeywords = input<readonly string[]>([]);
  readonly kjShortcut     = input<string | null>(null);

  readonly activate = output<T | undefined>();

  readonly id = `kj-list-item-${++_id}`;

  private readonly el = inject(ElementRef<HTMLElement>);
  readonly disabled = inject(KjDisabled).disabled;

  private readonly _elText = signal('');
  readonly value     = computed<T | undefined>(() => this.kjItemValue());
  readonly label     = computed(() => (this.kjItemLabel() || this._elText()).trim());
  readonly haystacks = computed<readonly string[]>(() => [this.label(), ...this.kjItemKeywords()]);

  private readonly _visible = signal(true);
  readonly visible = this._visible.asReadonly();
  setVisible(v: boolean): void { this._visible.set(v); }

  readonly posInSet = signal<number | null>(null);
  readonly setSize  = signal<number | null>(null);

  private readonly selection = inject<KjSelectionModel<T> | null>(KjSelectionModel as never, { optional: true });
  readonly ariaSelected = computed<'true' | 'false' | null>(() => {
    if (!this.selection) return null;
    const v = this.value();
    if (v === undefined) return null;
    return this.selection.isSelected(v) ? 'true' : 'false';
  });

  ngAfterContentInit(): void {
    this._elText.set(this.el.nativeElement.textContent ?? '');
  }

  _activate(): void {
    if (this.disabled()) return;
    this.activate.emit(this.value());
  }
}
