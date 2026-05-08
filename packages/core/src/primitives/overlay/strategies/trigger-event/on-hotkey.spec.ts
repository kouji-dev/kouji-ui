import { describe, it, expect, vi } from 'vitest';
import { onHotkey } from './on-hotkey';

describe('onHotkey', () => {
  it('matches mod+k as ctrl+k on non-Mac and triggers toggle', () => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const toggle = vi.fn();
    const s = onHotkey('mod+k');
    s.attach({} as never);
    s.bindToggle(toggle);

    const e = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: !isMac,
      metaKey: isMac,
      cancelable: true,
    });
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
});
