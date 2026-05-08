import type { KjBackdropStrategy } from '../../tokens';

export interface KjSolidBackdropOpts {
  inert?: boolean;
  closeOnClick?: boolean;
  className?: string;
}

export interface KjSolidBackdropStrategy extends KjBackdropStrategy {
  readonly className: string;
}

export function solidBackdrop(opts: KjSolidBackdropOpts = {}): KjSolidBackdropStrategy {
  return {
    inertSiblings: opts.inert ?? true,
    closeOnClick: opts.closeOnClick ?? true,
    className: opts.className ?? 'kj-backdrop',
    attach() {},
    onOpen() {},
    onClose() {},
    detach() {},
  };
}
