import { Injectable } from '@angular/core';

/**
 * Stable id minter. Used by overlay panels, form fields, and any other
 * primitive that needs deterministic ids (including across SSR boundaries).
 *
 * Counter is per-application; pair an app-level provider override with a
 * deterministic seed if you need cross-render stability beyond a single render.
 */
@Injectable({ providedIn: 'root' })
export class KjId {
  private _counter = 0;
  mint(prefix = ''): string {
    const id = ++this._counter;
    return prefix ? `kj-${prefix}-${id}` : `kj-${id}`;
  }
}
