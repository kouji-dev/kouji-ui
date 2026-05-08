import type { KjScrollLockStrategy } from '../../tokens';

let _count = 0;
let _savedOverflow: string | null = null;
let _savedPaddingRight: string | null = null;

const acquire = (): (() => void) => {
  if (typeof document === 'undefined') return () => {};
  _count++;
  if (_count === 1) {
    const html = document.documentElement;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    _savedOverflow = html.style.overflow;
    _savedPaddingRight = html.style.paddingRight;
    html.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      const existing = parseFloat(getComputedStyle(html).paddingRight) || 0;
      html.style.paddingRight = `${existing + scrollbarWidth}px`;
    }
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    _count--;
    if (_count === 0) {
      const html = document.documentElement;
      html.style.overflow = _savedOverflow ?? '';
      html.style.paddingRight = _savedPaddingRight ?? '';
      _savedOverflow = null;
      _savedPaddingRight = null;
    }
  };
};

export function htmlOverflow(): KjScrollLockStrategy {
  let release: (() => void) | null = null;
  return {
    attach() {},
    onOpen() { release = acquire(); },
    onClose() { release?.(); release = null; },
    detach() { release?.(); release = null; },
  };
}
