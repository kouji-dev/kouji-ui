import { describe, it, expect, vi } from 'vitest';
import { onHotkey } from './on-hotkey';

const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

function modK(): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: 'k',
    ctrlKey: !isMac,
    metaKey: isMac,
    cancelable: true,
    bubbles: true,
  });
}

describe('onHotkey', () => {
  it('matches mod+k as ctrl+k on non-Mac and triggers toggle', () => {
    const toggle = vi.fn();
    const s = onHotkey('mod+k');
    s.attach({} as never);
    s.bindToggle(toggle);

    const e = modK();
    document.dispatchEvent(e);
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
    s.detach();
  });

  it('does not match without modifiers', () => {
    const toggle = vi.fn();
    const s = onHotkey('mod+k');
    s.attach({} as never);
    s.bindToggle(toggle);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    expect(toggle).not.toHaveBeenCalled();
    s.detach();
  });

  it('ariaHasPopup is null', () => {
    expect(onHotkey('mod+k').ariaHasPopup).toBeNull();
  });

  it('a keystroke another listener already handled is ignored: two hotkeys on one chord resolve first-wins (mfe F-8)', () => {
    const first = vi.fn();
    const second = vi.fn();
    const a = onHotkey('mod+k');
    const b = onHotkey('mod+k');
    a.attach({} as never); a.bindToggle(first);
    b.attach({} as never); b.bindToggle(second);

    document.dispatchEvent(modK());
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();

    const handled = modK();
    handled.preventDefault();
    document.dispatchEvent(handled);
    expect(first).toHaveBeenCalledTimes(1);

    a.detach(); b.detach();
  });

  it('target scopes the listener to a subtree; a null target installs nothing', () => {
    const root = document.createElement('div');
    const inside = document.createElement('input');
    root.appendChild(inside);
    const outside = document.createElement('input');
    document.body.append(root, outside);

    const toggle = vi.fn();
    const s = onHotkey('mod+k', { target: () => root });
    s.attach({} as never);
    s.bindToggle(toggle);

    outside.dispatchEvent(modK());
    expect(toggle).not.toHaveBeenCalled();
    inside.dispatchEvent(modK());
    expect(toggle).toHaveBeenCalledTimes(1);
    s.detach();
    inside.dispatchEvent(modK());
    expect(toggle).toHaveBeenCalledTimes(1);

    const none = vi.fn();
    const off = onHotkey('mod+k', { target: null });
    off.attach({} as never);
    off.bindToggle(none);
    document.dispatchEvent(modK());
    expect(none).not.toHaveBeenCalled();
    off.detach();

    root.remove(); outside.remove();
  });
});
