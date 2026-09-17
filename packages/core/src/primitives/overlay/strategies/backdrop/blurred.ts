import { solidBackdrop, type KjSolidBackdropOpts, type KjSolidBackdropStrategy } from './solid';

/** Class the blurred scrim carries next to `kj-backdrop`; the `backdrop-filter` rule for it lives in the overlay stylesheet. */
export const KJ_BACKDROP_BLUR_CLASS = 'kj-backdrop--blur';

/**
 * {@link solidBackdrop} whose scrim also carries {@link KJ_BACKDROP_BLUR_CLASS},
 * so the page behind a modal is blurred as well as dimmed. Identical to
 * `solidBackdrop()` in behaviour (inert page, close on click); only the
 * scrim's class list differs, and the stylesheet decides what the class
 * paints. `className` replaces the whole class list.
 */
export function blurredBackdrop(opts: KjSolidBackdropOpts = {}): KjSolidBackdropStrategy {
  return solidBackdrop({ ...opts, className: opts.className ?? `kj-backdrop ${KJ_BACKDROP_BLUR_CLASS}` });
}
