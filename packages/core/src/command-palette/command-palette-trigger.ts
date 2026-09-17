// command-palette-trigger.ts
import { Directive, effect, inject, input, untracked } from '@angular/core';
import { KjOverlayTrigger } from '../primitives/overlay/trigger';
import type { KjOverlayPanel } from '../primitives/overlay/panel';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
} from '../primitives/overlay/tokens';
import { onHotkey } from '../primitives/overlay/strategies/trigger-event/on-hotkey';
import {
  switchableTriggerEvent,
  type KjSwitchableTriggerStrategy,
} from '../primitives/overlay/strategies/trigger-event/compose';

/**
 * Hotkey-driven trigger for the command palette. Toggles the linked
 * `<kj-command-palette-dialog>` panel when the configured chord fires
 * (default `mod+k` — Cmd+K on macOS, Ctrl+K elsewhere).
 *
 * Composes `KjOverlayTrigger` via `hostDirectives` and provides an
 * `onHotkey()` trigger-event strategy (replacing the legacy
 * `KjCommandPaletteHotkey` directive) through a switchable slot, so the
 * chord follows the `kjHotkey` binding. A keystroke another listener
 * already handled is ignored, so two palettes on one chord in a document
 * never both open.
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
 * @doc-category Core/Actions
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
      useFactory: () => switchableTriggerEvent(),
    },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
})
export class KjCommandPaletteTrigger {
  /** Keyboard chord. `mod` resolves to `Meta` on macOS, `Ctrl` elsewhere. An empty chord installs no listener. */
  readonly kjHotkey = input<string>('mod+k');

  private readonly _overlayTrigger = inject(KjOverlayTrigger, { self: true });
  private readonly triggerSlot = inject(KJ_OVERLAY_TRIGGER_EVENT_STRATEGY) as KjSwitchableTriggerStrategy;

  /** The controller of the composed `KjOverlayTrigger`, exposed for sibling `[kjFor]` panels. */
  get controller(): KjOverlayController {
    return this._overlayTrigger.controller;
  }
  attachPanel(panel: KjOverlayPanel): void {
    this._overlayTrigger.attachPanel(panel);
  }

  constructor() {
    effect(() => {
      const chord = this.kjHotkey().trim();
      untracked(() => this.triggerSlot.use(chord ? onHotkey(chord) : onHotkey('', { target: null })));
    });
  }
}
