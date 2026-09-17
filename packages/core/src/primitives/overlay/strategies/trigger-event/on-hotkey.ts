import type { KjTriggerEventStrategy } from '../../tokens';
import type { KjOverlayContext } from '../../context';

interface ParsedChord { mod: boolean; ctrl: boolean; alt: boolean; shift: boolean; key: string; }

function parseChord(chord: string): ParsedChord {
  const parts = chord.toLowerCase().split('+').map(p => p.trim());
  const out: ParsedChord = { mod: false, ctrl: false, alt: false, shift: false, key: '' };
  for (const p of parts) {
    if (p === 'mod') out.mod = true;
    else if (p === 'ctrl' || p === 'control') out.ctrl = true;
    else if (p === 'alt' || p === 'option') out.alt = true;
    else if (p === 'shift') out.shift = true;
    else out.key = p;
  }
  return out;
}

function isMac(target: EventTarget | null): boolean {
  // Resolved from the target's own window: the chord is matched against the
  // platform the keystroke came from, and there is no global to reach for.
  const doc = target && 'ownerDocument' in target
    ? (target as Node).ownerDocument
    : (target as Document | null);
  const nav = (doc?.defaultView ?? (target as Window | null))?.navigator;
  return !!nav && /Mac|iPhone|iPad|iPod/.test(nav.platform);
}

function matches(e: KeyboardEvent, parsed: ParsedChord, target: EventTarget | null): boolean {
  if (e.key.toLowerCase() !== parsed.key) return false;
  const mac = isMac(target);
  const wantMeta = parsed.mod && mac;
  const wantCtrl = parsed.ctrl || (parsed.mod && !mac);
  if (!!e.metaKey !== wantMeta) return false;
  if (!!e.ctrlKey !== wantCtrl) return false;
  if (!!e.altKey !== parsed.alt) return false;
  if (!!e.shiftKey !== parsed.shift) return false;
  return true;
}

/** Options for {@link onHotkey}. */
export interface KjOnHotkeyOpts {
  /**
   * Where the `keydown` listener is installed. Defaults to `document`, so
   * the chord works wherever focus is — including on `<body>`. Pass an app
   * root element (or a function resolving one) to confine the chord to
   * keystrokes dispatched inside that subtree; a `null` result installs
   * nothing. Two documents-level hotkeys on one chord never both fire: the
   * first listener to handle a keystroke marks it `defaultPrevented` and
   * every later one skips it.
   */
  target?: EventTarget | null | (() => EventTarget | null);
}

/**
 * Trigger-event strategy that toggles the overlay on a keyboard chord
 * (`'mod+k'`: Cmd+K on macOS, Ctrl+K elsewhere; also `ctrl`, `alt`,
 * `shift`). A keystroke another listener already handled
 * (`defaultPrevented`) is ignored, so overlays sharing a chord in one
 * document resolve first-listener-wins instead of all opening at once.
 * Running two independently bootstrapped apps in one document is not a
 * supported target; give each its own chord or {@link KjOnHotkeyOpts.target}.
 */
export function onHotkey(chord: string, opts: KjOnHotkeyOpts = {}): KjTriggerEventStrategy {
  const parsed = parseChord(chord);
  let toggle: (() => void) | null = null;
  let listener: ((e: KeyboardEvent) => void) | null = null;
  let installedOn: EventTarget | null = null;
  let ctx: KjOverlayContext | null = null;

  const resolveTarget = (): EventTarget | null => {
    const t = opts.target;
    if (t === undefined) {
      // The overlay's own elements name the document when they are known;
      // `attach()` can run before either exists, so the ambient document
      // (read off `globalThis`, not the bare binding) stays the fallback.
      return (
        ctx?.triggerEl?.()?.ownerDocument ??
        ctx?.panelEl?.()?.ownerDocument ??
        (globalThis as { document?: Document }).document ??
        null
      );
    }
    return typeof t === 'function' ? t() : t;
  };

  const install = () => {
    if (installedOn) return;
    const target = resolveTarget();
    if (!target) return;
    listener = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (matches(e, parsed, installedOn)) { e.preventDefault(); toggle?.(); }
    };
    target.addEventListener('keydown', listener as EventListener);
    installedOn = target;
  };

  return {
    ariaHasPopup: null,
    attach(c) { ctx = c; install(); },
    bindToggle(t) { toggle = t; install(); },
    onOpen() {}, onClose() {},
    detach() {
      if (installedOn && listener) installedOn.removeEventListener('keydown', listener as EventListener);
      listener = null; toggle = null; installedOn = null; ctx = null;
    },
  };
}
