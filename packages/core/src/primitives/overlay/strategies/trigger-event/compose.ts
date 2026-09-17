import type { KjOverlayContext } from '../../context';
import type { KjTriggerEventStrategy } from '../../tokens';

/**
 * Fans one trigger slot out to several event strategies — e.g. hover for
 * pointer users, focus for keyboard users and an open-only click for touch —
 * so a single overlay opens from whichever the user has. `ariaHasPopup` is
 * the first non-null value among the parts.
 */
export function composeTriggerEvents(...parts: KjTriggerEventStrategy[]): KjTriggerEventStrategy {
  return {
    ariaHasPopup: parts.find((p) => p.ariaHasPopup !== null)?.ariaHasPopup ?? null,
    attach(ctx: KjOverlayContext) {
      for (const p of parts) p.attach(ctx);
    },
    bindToggle(toggle) {
      for (const p of parts) p.bindToggle(toggle);
    },
    onOpen() {
      for (const p of parts) p.onOpen?.();
    },
    onClose() {
      for (const p of parts) p.onClose?.();
    },
    detach() {
      for (const p of parts) p.detach();
    },
  };
}

/**
 * Gates a trigger strategy behind a predicate: while `enabled()` is `false`
 * the wrapped strategy can still close the overlay but never opens it, so a
 * `kjDisabled` trigger stays inert without detaching its listeners.
 */
export function whenEnabled(
  strategy: KjTriggerEventStrategy,
  enabled: () => boolean,
): KjTriggerEventStrategy {
  let ctx: KjOverlayContext | null = null;
  return {
    ariaHasPopup: strategy.ariaHasPopup,
    attach(c) {
      ctx = c;
      strategy.attach(c);
    },
    bindToggle(toggle) {
      strategy.bindToggle(() => {
        if (!enabled() && !ctx?.isOpen()) return;
        toggle();
      });
    },
    onOpen() {
      strategy.onOpen?.();
    },
    onClose() {
      strategy.onClose?.();
    },
    detach() {
      strategy.detach();
      ctx = null;
    },
  };
}

/** {@link switchableTriggerEvent}'s return type: a trigger slot whose strategy can be swapped. */
export type KjSwitchableTriggerStrategy = KjTriggerEventStrategy & {
  /** Swaps the active strategy: the previous one is detached, the new one attached and bound. */
  use(strategy: KjTriggerEventStrategy): void;
};

/**
 * A trigger slot whose concrete strategy is chosen after construction. The
 * DI factory that provides a trigger strategy runs before the directive's
 * inputs are set, so a directive that offers `kjTrigger="click|hover"` cannot
 * pick the strategy in the factory; it provides this shell and calls `use()`
 * from an effect once the input is known (and again if it changes).
 */
export function switchableTriggerEvent(
  opts: { ariaHasPopup?: KjTriggerEventStrategy['ariaHasPopup'] } = {},
): KjSwitchableTriggerStrategy {
  let ctx: KjOverlayContext | null = null;
  let toggle: (() => void) | null = null;
  let current: KjTriggerEventStrategy | null = null;

  return {
    // Fixed up front: the host reads it once, before `use()` picks a strategy.
    ariaHasPopup: opts.ariaHasPopup ?? null,
    attach(c) {
      ctx = c;
      current?.attach(c);
    },
    bindToggle(t) {
      toggle = t;
      current?.bindToggle(t);
    },
    onOpen() {
      current?.onOpen?.();
    },
    onClose() {
      current?.onClose?.();
    },
    detach() {
      current?.detach();
      current = null;
      ctx = null;
      toggle = null;
    },
    use(strategy) {
      current?.detach();
      current = strategy;
      if (ctx) strategy.attach(ctx);
      if (toggle) strategy.bindToggle(toggle);
    },
  };
}
