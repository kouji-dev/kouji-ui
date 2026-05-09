import {
  DestroyRef,
  Directive,
  ElementRef,
  OnInit,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { KJ_COMMAND_PALETTE, nextCommandItemId } from './command-palette.context';

/**
 * Individual command item (`role="option"`). Register with the parent
 * `[kjCommandPalette]` via DI on init, deregister on destroy.
 *
 * Filter haystacks are derived from `textContent` plus optional `kjKeywords`.
 * The item is hidden (`[hidden]`) when its filter score is 0.
 *
 * @example
 * ```html
 * <div kjCommandPalette>
 *   <div kjCommandList>
 *     <button kjCommandItem [kjValue]="'open-settings'">Settings</button>
 *   </div>
 * </div>
 * ```
 * @doc-category Core/Actions
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: '[kjCommandItem]',
  standalone: true,
  exportAs: 'kjCommandItem',
  host: {
    'role': 'option',
    '[id]': 'id',
    '[attr.aria-selected]': 'isActive() ? "true" : "false"',
    '[attr.aria-disabled]': 'kjDisabled() ? "true" : null',
    '[attr.data-active]': 'isActive() ? "" : null',
    '[attr.hidden]': 'isHidden() ? "" : null',
    'tabindex': '-1',
    '(click)': 'onClick()',
    '(mouseenter)': 'onMouseEnter()',
  },
})
export class KjCommandItem implements OnInit {
  private readonly ctx = inject(KJ_COMMAND_PALETTE);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Stable auto-generated id for this item. */
  readonly id = nextCommandItemId();

  /** Value emitted on activation. Falls back to `el.textContent` if unset. */
  readonly kjValue = input<unknown>(undefined);

  /** Extra filter haystacks (synonyms / keywords). */
  readonly kjKeywords = input<readonly string[]>([]);

  /** Disable the item. Reflects `aria-disabled`. */
  readonly kjDisabled = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** Filter score signal — updated by the palette's filter pass. */
  readonly score = signal(1);

  /**
   * Filter haystacks: the element's text content + keywords.
   * Re-derived any time keywords change.
   */
  readonly haystacks = computed(() => [
    this.el.nativeElement.textContent?.trim() ?? '',
    ...this.kjKeywords(),
  ]);

  /** Whether this item is the active (highlighted) item. */
  readonly isActive = computed(() =>
    this.ctx.activeValue() === this.effectiveValue()
  );

  /**
   * Whether this item is filtered out (not in the visible items list).
   * Re-evaluated whenever the palette's visible items change.
   */
  readonly isHidden = computed(() => {
    const val = this.effectiveValue();
    return !this.ctx.visibleItems().some(i => i.value === val);
  });

  /** The effective value: `kjValue()` if set, otherwise `el.textContent`. */
  private readonly effectiveValue = computed(() => {
    const v = this.kjValue();
    return v !== undefined ? v : this.el.nativeElement.textContent?.trim();
  });

  ngOnInit(): void {
    this.ctx.registerItem({
      id: this.id,
      value: this.effectiveValue(),
      disabled: this.kjDisabled,
      el: this.el.nativeElement,
      haystacks: this.haystacks,
      score: this.score,
    });

    this.destroyRef.onDestroy(() => {
      this.ctx.unregisterItem({
        id: this.id,
        value: this.effectiveValue(),
        disabled: this.kjDisabled,
        el: this.el.nativeElement,
        haystacks: this.haystacks,
        score: this.score,
      });
    });
  }

  onClick(): void {
    if (this.kjDisabled()) return;
    this.ctx.activate(this.effectiveValue());
  }

  onMouseEnter(): void {
    if (this.kjDisabled()) return;
    // Hover sets the active item without firing the activation event.
    this.ctx.setActiveValue(this.effectiveValue());
  }
}
