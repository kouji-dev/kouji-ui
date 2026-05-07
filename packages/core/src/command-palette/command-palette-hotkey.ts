import {
  Directive,
  HostListener,
  WritableSignal,
  booleanAttribute,
  input,
} from '@angular/core';

/**
 * Global keyboard shortcut listener that toggles a command palette.
 * Default chord: `mod+k` (Cmd+K on macOS, Ctrl+K elsewhere).
 *
 * The `kjCommandPaletteHotkey` input accepts a `WritableSignal<boolean>`
 * that controls the palette open state.
 *
 * @example
 * ```html
 * <div [kjCommandPaletteHotkey]="paletteOpen" kjHotkey="mod+k">
 *   …app shell…
 * </div>
 * ```
 * @category Core/Actions
 */
@Directive({
  selector: '[kjCommandPaletteHotkey]',
  standalone: true,
})
export class KjCommandPaletteHotkey {
  /** The open-state signal to toggle. */
  readonly kjCommandPaletteHotkey = input.required<WritableSignal<boolean>>();

  /** Keyboard chord. `mod` resolves to `Meta` on macOS, `Ctrl` elsewhere. */
  readonly kjHotkey = input<string>('mod+k');

  /** Disable the hotkey without unmounting the directive. */
  readonly kjHotkeyEnabled = input<boolean, unknown>(true, { transform: booleanAttribute });

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.kjHotkeyEnabled()) return;
    if (!this.matchesHotkey(event)) return;
    event.preventDefault();
    this.kjCommandPaletteHotkey().update(v => !v);
  }

  private matchesHotkey(event: KeyboardEvent): boolean {
    const chord = this.kjHotkey().toLowerCase();
    const parts = chord.split('+');
    const key = parts[parts.length - 1];
    const needsMod = parts.includes('mod');
    const needsShift = parts.includes('shift');
    const needsAlt = parts.includes('alt');

    const isMac = typeof navigator !== 'undefined' &&
      (navigator.platform?.toLowerCase().includes('mac') ||
       (navigator as Navigator & { userAgentData?: { platform: string } })
         .userAgentData?.platform?.toLowerCase().includes('mac'));

    const modPressed = isMac ? event.metaKey : event.ctrlKey;

    if (needsMod && !modPressed) return false;
    if (needsShift && !event.shiftKey) return false;
    if (needsAlt && !event.altKey) return false;
    return event.key.toLowerCase() === key;
  }
}
