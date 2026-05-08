import type { KjTriggerEventStrategy } from '../../tokens';

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

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function matches(e: KeyboardEvent, parsed: ParsedChord): boolean {
  if (e.key.toLowerCase() !== parsed.key) return false;
  const wantMeta = parsed.mod && isMac();
  const wantCtrl = parsed.ctrl || (parsed.mod && !isMac());
  if (!!e.metaKey !== wantMeta) return false;
  if (!!e.ctrlKey !== wantCtrl) return false;
  if (!!e.altKey !== parsed.alt) return false;
  if (!!e.shiftKey !== parsed.shift) return false;
  return true;
}

export function onHotkey(chord: string): KjTriggerEventStrategy {
  const parsed = parseChord(chord);
  let toggle: (() => void) | null = null;
  let listener: ((e: KeyboardEvent) => void) | null = null;
  let installed = false;

  const install = () => {
    if (installed || typeof document === 'undefined') return;
    listener = (e: KeyboardEvent) => {
      if (matches(e, parsed)) { e.preventDefault(); toggle?.(); }
    };
    document.addEventListener('keydown', listener);
    installed = true;
  };

  return {
    ariaHasPopup: null,
    attach() { install(); },
    bindToggle(t) { toggle = t; install(); },
    onOpen() {}, onClose() {},
    detach() {
      if (listener) document.removeEventListener('keydown', listener);
      listener = null; toggle = null; installed = false;
    },
  };
}
