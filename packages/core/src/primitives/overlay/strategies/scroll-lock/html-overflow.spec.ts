import { TestBed } from '@angular/core/testing';
import { describe, it, expect, afterEach } from 'vitest';
import { htmlOverflow } from './html-overflow';

describe('htmlOverflow', () => {
  afterEach(() => {
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
  });

  it('onOpen acquires lock; onClose releases', () => {
    TestBed.runInInjectionContext(() => {
      const s = htmlOverflow();
      s.attach({} as never);
      s.onOpen!();
      expect(document.documentElement.style.overflow).toBe('hidden');
      s.onClose!();
      expect(document.documentElement.style.overflow).toBe('');
    });
  });
});
