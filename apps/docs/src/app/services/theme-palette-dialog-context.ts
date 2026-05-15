import { Injectable, signal } from '@angular/core';
import type { BgSlot, FgSlot } from '../lib/theme/types';

/** What the palette modal is editing — set before `KjDialogService.open`, cleared after close. */
export type ThemePalettePayload =
  | { kind: 'bg'; slot: BgSlot }
  | { kind: 'fg'; slot: FgSlot };

@Injectable({ providedIn: 'root' })
export class ThemePaletteDialogContext {
  private readonly _payload = signal<ThemePalettePayload | null>(null);
  readonly payload = this._payload.asReadonly();

  start(p: ThemePalettePayload): void {
    this._payload.set(p);
  }

  end(): void {
    this._payload.set(null);
  }
}
