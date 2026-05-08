import type { KjOverlayContext } from '../../context';
import type { KjPositionStrategy } from '../../tokens';

export function inPlaceSibling(): KjPositionStrategy {
  let _ctx: KjOverlayContext | null = null;
  return {
    attach(c) { _ctx = c; },
    onOpen() {},
    onClose() {},
    update() {},
    detach() { _ctx = null; },
  };
}
