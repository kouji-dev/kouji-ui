import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService URL priority', () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
    localStorage.clear();
  });

  function setLocationSearch(search: string) {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search },
      configurable: true,
    });
  }

  it('uses ?theme= when present and valid', async () => {
    setLocationSearch('?theme=cyberpunk');
    localStorage.setItem('kj-theme', 'kouji');
    TestBed.configureTestingModule({});
    const svc = TestBed.inject(ThemeService);
    await new Promise((r) => setTimeout(r, 0));
    expect(svc.theme()).toBe('cyberpunk');
  });

  it('falls back to localStorage when no URL param', async () => {
    setLocationSearch('');
    localStorage.setItem('kj-theme', 'dark');
    TestBed.configureTestingModule({});
    const svc = TestBed.inject(ThemeService);
    await new Promise((r) => setTimeout(r, 0));
    expect(svc.theme()).toBe('dark');
  });

  it('defaults to kouji when neither URL nor localStorage are set', async () => {
    setLocationSearch('');
    TestBed.configureTestingModule({});
    const svc = TestBed.inject(ThemeService);
    await new Promise((r) => setTimeout(r, 0));
    expect(svc.theme()).toBe('kouji');
  });

  it('ignores invalid URL theme and falls back to localStorage', async () => {
    setLocationSearch('?theme=not-a-theme');
    localStorage.setItem('kj-theme', 'light');
    TestBed.configureTestingModule({});
    const svc = TestBed.inject(ThemeService);
    await new Promise((r) => setTimeout(r, 0));
    expect(svc.theme()).toBe('light');
  });

  it('does not persist URL theme to localStorage', async () => {
    setLocationSearch('?theme=retro');
    TestBed.configureTestingModule({});
    TestBed.inject(ThemeService);
    await new Promise((r) => setTimeout(r, 0));
    expect(localStorage.getItem('kj-theme')).toBeNull();
  });
});
