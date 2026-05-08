import type { KjOverlayContext } from '../../context';
import type { KjPositionStrategy } from '../../tokens';

export function inPlaceSibling(): KjPositionStrategy {
  let ctx: KjOverlayContext | null = null;
  return {
    attach(c) { ctx = c; },
    onOpen() {},
    onClose() {},
    update() {},
    detach() { ctx = null; },
  };
}
