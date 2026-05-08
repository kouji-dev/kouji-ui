import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ThemeUrlService } from './theme-url.service';
import { ThemeDraftService } from './theme-draft.service';
import { BUILT_IN_NAMES } from '../lib/theme/built-in-themes';

describe('ThemeUrlService encode/decode', () => {
  let svc: ThemeUrlService;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ThemeUrlService);
  });

  test('round-trips a draft', async () => {
    const draftService = TestBed.inject(ThemeDraftService);
    draftService.loadFork(BUILT_IN_NAMES[0]);
    const draft = draftService.draft();
    const hash = await svc.encode(draft);
    const decoded = await svc.decode(hash);
    expect(decoded?.colors).toEqual(draft.colors);
  });

  test('rejects unknown major version', async () => {
    const forged = btoa(JSON.stringify({ v: 2, d: {} })).replace(/=+$/, '');
    expect(await svc.decode('t=' + forged)).toBeNull();
  });

  test('returns null for malformed hash', async () => {
    expect(await svc.decode('t=!!!notbase64')).toBeNull();
    expect(await svc.decode('')).toBeNull();
    expect(await svc.decode('garbage')).toBeNull();
  });
});
