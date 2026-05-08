// command-palette-trigger.ts
import { Directive, input } from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import { onHotkey } from '../primitives/overlay/strategies/trigger-event/on-hotkey';

/**
 * Hotkey-driven trigger for the command palette. Toggles the linked
 * `<kj-command-palette-dialog>` panel when the configured chord fires
 * (default `mod+k` — Cmd+K on macOS, Ctrl+K elsewhere).
 *
 * Composes `KjOverlayTrigger` via `hostDirectives` and provides an
 * `onHotkey()` trigger-event strategy (replacing the legacy
 * `KjCommandPaletteHotkey` directive).
 *
 * @example
 * ```html
 * <button kjCommandPaletteTrigger #t="kjCommandPaletteTrigger" kjHotkey="mod+k">
 *   Open palette
 * </button>
 * <kj-command-palette-dialog [kjFor]="t">
 *   <div kjCommandPalette>...</div>
 * </kj-command-palette-dialog>
 * ```
 *
 * @category Core/Actions
 */
@Directive({
  selector: '[kjCommandPaletteTrigger]',
  exportAs: 'kjCommandPaletteTrigger',
  standalone: true,
  hostDirectives: [
    { directive: KjOverlayTrigger, inputs: ['kjOpen'] },
  ],
  providers: [
    KjOverlayController,
    {
      provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
      useFactory: () => onHotkey('mod+k'),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
})
export class KjCommandPaletteTrigger {
  /**
   * Keyboard chord. `mod` resolves to `Meta` on macOS, `Ctrl` elsewhere.
   * Captured at provider construction; reactive switching is a follow-up.
   */
  readonly kjHotkey = input<string>('mod+k');
}
