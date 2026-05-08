import type { KjScrollLockStrategy } from '../../tokens';

let _count = 0;
let _saved: string | null = null;

export function cssClip(): KjScrollLockStrategy {
  let acquired = false;
  return {
    attach() {},
    onOpen() {
      if (typeof document === 'undefined') return;
      _count++;
      acquired = true;
      if (_count === 1) {
        _saved = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'clip';
      }
    },
    onClose() {
      if (typeof document === 'undefined' || !acquired) return;
      acquired = false;
      _count--;
      if (_count === 0) {
        document.documentElement.style.overflow = _saved ?? '';
        _saved = null;
      }
    },
    detach() {
      if (acquired) {
        acquired = false;
        _count--;
        if (_count === 0 && typeof document !== 'undefined') {
          document.documentElement.style.overflow = _saved ?? '';
          _saved = null;
        }
      }
    },
  };
}
