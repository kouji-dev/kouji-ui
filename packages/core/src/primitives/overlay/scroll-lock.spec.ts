import { TestBed } from '@angular/core/testing';
import { describe, it, expect, afterEach } from 'vitest';
import { KjScrollLock } from './scroll-lock';

describe('KjScrollLock', () => {
  afterEach(() => {
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
  });

  it('acquire sets overflow:hidden on <html>', () => {
    const svc = TestBed.inject(KjScrollLock);
    const release = svc.acquire();
    expect(document.documentElement.style.overflow).toBe('hidden');
    release();
  });

  it('multiple acquires share one lock; releases ref-counted', () => {
    const svc = TestBed.inject(KjScrollLock);
    const r1 = svc.acquire();
    const r2 = svc.acquire();
    expect(document.documentElement.style.overflow).toBe('hidden');
    r1();
    expect(document.documentElement.style.overflow).toBe('hidden');
    r2();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('release is idempotent', () => {
    const svc = TestBed.inject(KjScrollLock);
    const release = svc.acquire();
    release();
    release();
    expect(document.documentElement.style.overflow).toBe('');
  });
});
