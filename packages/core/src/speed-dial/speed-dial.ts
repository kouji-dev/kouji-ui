import {
  Directive,
  booleanAttribute,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  inject,
} from '@angular/core';
import {
  KJ_SPEED_DIAL,
  type KjSpeedDialContext,
  type KjSpeedDialDirection,
  nextKjSpeedDialId,
} from './speed-dial.context';
import { DOCUMENT } from '@angular/common';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  type KjTriggerEventStrategy,
} from '../primitives/overlay/tokens';
import type { KjCloseReason } from '../primitives/overlay/types';
import { inPlace } from '../primitives/overlay/strategies/mount/in-place';
import { inPlaceSibling } from '../primitives/overlay/strategies/position/in-place-sibling';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';
import { whenEnabled } from '../primitives/overlay/strategies/trigger-event/compose';

/** Click trigger for a speed dial, with the disabled gate wired after DI has built it. */
interface KjSpeedDialTriggerStrategy extends KjTriggerEventStrategy {
  configure(opts: { disabled: () => boolean }): void;
}

/**
 * @internal The dial's trigger-event strategy: a plain click toggle that
 * advertises `aria-haspopup="menu"`, gated on the root's `kjDisabled`. The
 * gate is a closure rather than a factory argument because the root
 * directive that owns the input does not exist yet when this provider runs.
 */
function speedDialTriggerEvents(): KjSpeedDialTriggerStrategy {
  let disabled: () => boolean = () => false;
  const gated = whenEnabled(onClick(), () => !disabled());
  return {
    ...gated,
    ariaHasPopup: 'menu',
    configure({ disabled: d }) { disabled = d; },
  };
}

/**
 * Root container for a Speed Dial / FAB.
 *
 * A Speed Dial is a viewport-anchored floating action button that, when
 * activated, fans out a cluster of secondary action buttons. This directive
 * owns one {@link KjOverlayController} and exposes its state to descendant
 * trigger, container and action directives via the {@link KJ_SPEED_DIAL}
 * injection token.
 *
 * **It is a real overlay.** The controller registers with `KjOverlayStack`
 * while the dial is open, so Escape closes it from anywhere inside it (not
 * only from the trigger), a press outside the cluster dismisses it, focus
 * returns to the trigger on close, and a dial opened over a dialog and the
 * dialog beneath it no longer both answer the same Escape. The cluster is
 * mounted `inPlace()` and positioned by CSS — nothing is portalled, so the
 * inline DOM a consumer writes is the DOM that renders.
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
 * @doc-category Core/Actions
 * @doc
 * @doc-name speed-dial
 * @doc-description Unstyled speed dial root that owns open state and fan-out direction for trigger and action children.
 * @doc-is-main
 */
@Directive({
  selector: '[kjSpeedDial]',
  standalone: true,
  exportAs: 'kjSpeedDial',
  providers: [
    { provide: KJ_SPEED_DIAL, useExisting: KjSpeedDial },
    KjOverlayController,
    // The cluster renders where the consumer wrote it and is laid out by the
    // stylesheet next to the trigger; neither a portal nor anchored maths.
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => inPlace() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => inPlaceSibling() },
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: speedDialTriggerEvents },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'menu' as const },
  ],
  host: {
    '[attr.data-direction]': 'kjDirection()',
    '[attr.data-expanded]': 'expanded() ? "" : null',
    '[attr.data-disabled]': 'kjDisabled() ? "" : null',
    '(mouseenter)': 'onPointerEnter()',
    '(mouseleave)': 'onPointerLeave()',
  },
})
export class KjSpeedDial implements KjSpeedDialContext {
  private readonly document = inject(DOCUMENT);
  /** @internal The overlay this dial is; exposed so the trigger and cluster can bind to it. */
  readonly controller = inject(KjOverlayController);

  /** Direction the action cluster fans out from the trigger. Defaults to `'up'`. */
  readonly kjDirection = input<KjSpeedDialDirection>('up');

  /** Two-way bindable expanded state (input half). Defaults to `false`. */
  readonly kjOpenInput = input<boolean, unknown>(false, {
    // eslint-disable-next-line @angular-eslint/no-input-rename -- alias keeps the public `kjOpen` name distinct from the controller-backed property below
    alias: 'kjOpen',
    transform: booleanAttribute,
  });
  /**
   * Whether the dial is open. Read-only: the controller is the single source
   * of truth, so write through `open()` / `close()` / `toggle()` or the
   * `[(kjOpen)]` binding rather than setting this.
   */
  readonly kjOpen = computed(() => this.controller.isOpen());

  /**
   * Disables opening; if open, closes. Defaults to `false`.
   *
   * Deliberately *not* composed from {@link KjDisabled} (arch F-16): this host
   * is a role-less container, and `aria-disabled` is not a global attribute —
   * it belongs on the trigger `<button>`, which carries it. The root reflects
   * `data-disabled` only, which is what the stylesheet reads.
   */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Open on hover (desktop only — coarse pointers always click-to-open). Defaults to `false`. */
  readonly kjOpenOnHover = input(false, { transform: booleanAttribute });

  /** Convenience output paired with the `kjOpen` input, deduplicated against internal writes. */
  readonly kjOpenChange = output<boolean>();

  // ── KjSpeedDialContext fields ────────────────────────────────────────

  /** Stable id of the action cluster, referenced by the trigger's `aria-controls`. */
  readonly contentId: string = nextKjSpeedDialId();

  /** `true` while the cluster is fanned out and not disabled. Drives `aria-expanded`. */
  readonly expanded = computed(() => this.kjOpen() && !this.kjDisabled());

  /** Context-facing view of {@link kjDisabled}, read by the trigger and actions. */
  readonly disabled = computed(() => this.kjDisabled());

  /** Context-facing view of {@link kjDirection}. */
  readonly direction = computed(() => this.kjDirection());

  // Track the last value emitted to consumers so we don't double-emit when
  // an internal close is followed by the model effect.
  private readonly lastEmitted = signal<boolean>(false);

  constructor() {
    const strategy = inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY) as KjSpeedDialTriggerStrategy;
    // Read at event time, so flipping kjDisabled never rebuilds the strategy.
    strategy.configure({ disabled: () => this.kjDisabled() });

    // `[(kjOpen)]` → controller. Gated on the cluster having attached: a dial
    // rendered with `kjOpen` already set reached `open()` while the controller
    // still had no panel to mount, which left it stuck in `opening` — the app
    // never stabilised. (Same guard the command palette carries.)
    effect(() => {
      const want = this.kjOpenInput();
      if (!this.controller.panelEl()) return;
      const isOpen = untracked(() => this.controller.isOpen());
      if (want && !isOpen) this.open();
      if (!want && isOpen) this.controller.close('programmatic');
    });

    // controller → `(kjOpenChange)`, whatever moved it (trigger, Escape,
    // an outside press, an activated action, the input above).
    effect(() => {
      const isOpen = this.controller.isOpen();
      untracked(() => {
        if (this.lastEmitted() === isOpen) return;
        this.lastEmitted.set(isOpen);
        this.kjOpenChange.emit(isOpen);
      });
    });

    // Disabling an open dial closes it; the strategy gate only stops it opening.
    effect(() => {
      if (this.kjDisabled() && untracked(() => this.controller.isOpen())) {
        this.controller.close('programmatic');
      }
    });
  }

  // ── Mutations ────────────────────────────────────────────────────────

  /** Opens the dial unless it is disabled. */
  open(): void {
    if (this.kjDisabled()) return;
    this.controller.open();
  }

  /** Closes the dial. @param reason Why it closed; surfaces on the controller. */
  close(reason: KjCloseReason = 'programmatic'): void {
    this.controller.close(reason);
  }

  /** Opens a closed dial, closes an open one. */
  toggle(): void {
    if (this.controller.isOpen()) this.close('trigger');
    else this.open();
  }

  protected onPointerEnter(): void {
    if (!this.kjOpenOnHover()) return;
    if (this.kjDisabled()) return;
    if (this.document.defaultView?.matchMedia?.('(pointer: coarse)').matches) {
      return;
    }
    this.open();
  }

  protected onPointerLeave(): void {
    if (!this.kjOpenOnHover()) return;
    if (this.kjDisabled()) return;
    this.close('trigger');
  }
}
