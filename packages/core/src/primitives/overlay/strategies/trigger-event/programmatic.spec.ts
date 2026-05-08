import { describe, it, expect, vi } from 'vitest';
import { programmatic } from './programmatic';

describe('programmatic', () => {
  it('never invokes toggle from DOM events', () => {
    const toggle = vi.fn();
    const s = programmatic();
    s.attach({} as never);
    s.bindToggle(toggle);
    expect(toggle).not.toHaveBeenCalled();
  });

  it('ariaHasPopup is null', () => {
    expect(programmatic().ariaHasPopup).toBeNull();
  });
});
