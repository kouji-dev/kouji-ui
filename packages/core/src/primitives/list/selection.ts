import { Injectable } from '@angular/core';

/**
 * Minimal stub — Task 3 will overwrite this with the full implementation.
 * Exists only so `item.ts` can import + optionally inject `KjSelectionModel`
 * without a compile error before Task 3 lands.
 *
 * @doc-category Core/Primitives
 */
@Injectable()
export class KjSelectionModel<T = unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isSelected(_value: T): boolean { return false; }
}
