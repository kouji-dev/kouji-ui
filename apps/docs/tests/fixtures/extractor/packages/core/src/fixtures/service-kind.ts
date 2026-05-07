import { Injectable } from '@angular/core';

/**
 * Icon registry service.
 * @doc
 * @doc-name svc-page
 * @doc-is-main
 */
@Injectable({ providedIn: 'root' })
export class IconRegistry {
  /** Number of registered icons. */
  count = 0;
  /** Register an icon. */
  register(name: string, value: string): void {}
}
