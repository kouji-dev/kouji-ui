import { solidBackdrop, type KjSolidBackdropOpts, type KjSolidBackdropStrategy } from './solid';

export function blurredBackdrop(opts: KjSolidBackdropOpts = {}): KjSolidBackdropStrategy {
  return solidBackdrop({ ...opts, className: opts.className ?? 'kj-backdrop kj-backdrop--blur' });
}
