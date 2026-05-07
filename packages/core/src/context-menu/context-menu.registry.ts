import { Injectable } from '@angular/core';

/**
 * Internal registry that enforces the "one open context-menu panel at a time"
 * guarantee across triggers in the application.
 *
 * Triggers register themselves on open and unregister on close; opening a
 * second trigger while another is open closes the first via its supplied
 * `close` callback before the new panel becomes visible.
 *
 * @internal
 */
@Injectable({ providedIn: 'root' })
export class KjContextMenuRegistry {
  private current: { id: object; close: () => void } | null = null;

  /** Returns true when the given trigger identity is currently the open one. */
  isOpen(id: object): boolean {
    return this.current?.id === id;
  }

  /**
   * Mark the given trigger as the active context-menu owner. Closes any
   * previously open trigger via its registered `close` callback.
   */
  open(id: object, close: () => void): void {
    if (this.current && this.current.id !== id) {
      const prev = this.current;
      this.current = null;
      try {
        prev.close();
      } catch {
        /* ignore */
      }
    }
    this.current = { id, close };
  }

  /** Drops the registration if the given trigger is the active one. */
  close(id: object): void {
    if (this.current?.id === id) {
      this.current = null;
    }
  }
}
