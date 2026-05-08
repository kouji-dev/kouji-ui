import {
  Directive,
  booleanAttribute,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import {
  KJ_SPEED_DIAL,
  type KjSpeedDialContext,
  type KjSpeedDialDirection,
  nextKjSpeedDialId,
} from './speed-dial.context';

/**
 * Root container for a Speed Dial / FAB.
 *
 * A Speed Dial is a viewport-anchored floating action button that, when
 * activated, fans out a cluster of secondary action buttons. This directive
 * owns the open/closed state and exposes it to descendant trigger, container
 * and action directives via the {@link KJ_SPEED_DIAL} injection token.
 *
 * Reflects `data-direction`, `data-expanded` and `data-disabled` host
 * attributes for the styled wrapper to drive its layout and animation.
 *
 * @example
 * ```html
 * <div kjSpeedDial kjDirection="up">
 *   <button kjButton kjSpeedDialTrigger aria-label="Open menu">+</button>
 *   <div kjSpeedDialActions>
 *     <button kjButton kjSpeedDialAction aria-label="Edit">E</button>
 *     <button kjButton kjSpeedDialAction aria-label="Share">S</button>
 *   </div>
 * </div>
 * ```
 *
 * @category Core/Actions
 * @doc
 * @doc-name speed-dial
 * @doc-description Unstyled speed dial root that owns open state and fan-out direction for trigger and action children.
 * @doc-is-main
 */
@Directive({
  selector: '[kjSpeedDial]',
  standalone: true,
  exportAs: 'kjSpeedDial',
  providers: [{ provide: KJ_SPEED_DIAL, useExisting: KjSpeedDial }],
  host: {
    '[attr.data-direction]': 'kjDirection()',
    '[attr.data-expanded]': 'expanded() ? "" : null',
    '[attr.data-disabled]': 'kjDisabled() ? "" : null',
    '(mouseenter)': 'onPointerEnter()',
    '(mouseleave)': 'onPointerLeave()',
  },
})
export class KjSpeedDial implements KjSpeedDialContext {
  /** Direction the action cluster fans out from the trigger. */
  readonly kjDirection = input<KjSpeedDialDirection>('up');

  /** Two-way bindable expanded state. */
  readonly kjOpen = model<boolean>(false);

  /** Disables opening; if open, closes. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Open on hover (desktop only — coarse pointers always click-to-open). */
  readonly kjOpenOnHover = input(false, { transform: booleanAttribute });

  /** Convenience output paired with the `kjOpen` model. */
  readonly kjOpenChange = output<boolean>();

  // ── KjSpeedDialContext fields ────────────────────────────────────────

  readonly contentId: string = nextKjSpeedDialId();
  readonly expanded = computed(() => this.kjOpen() && !this.kjDisabled());
  readonly disabled = computed(() => this.kjDisabled());
  readonly direction = computed(() => this.kjDirection());

  // Track the last value emitted to consumers so we don't double-emit when
  // an internal close is followed by the model effect.
  private readonly lastEmitted = signal<boolean>(false);

  // ── Mutations ────────────────────────────────────────────────────────

  open(): void {
    if (this.kjDisabled()) return;
    if (this.kjOpen()) return;
    this.kjOpen.set(true);
    if (this.lastEmitted() !== true) {
      this.lastEmitted.set(true);
      this.kjOpenChange.emit(true);
    }
  }

  close(): void {
    if (!this.kjOpen()) return;
    this.kjOpen.set(false);
    if (this.lastEmitted() !== false) {
      this.lastEmitted.set(false);
      this.kjOpenChange.emit(false);
    }
  }

  toggle(): void {
    if (this.kjOpen()) this.close();
    else this.open();
  }

  protected onPointerEnter(): void {
    if (!this.kjOpenOnHover()) return;
    if (this.kjDisabled()) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
      return;
    }
    this.open();
  }

  protected onPointerLeave(): void {
    if (!this.kjOpenOnHover()) return;
    if (this.kjDisabled()) return;
    this.close();
  }
}
