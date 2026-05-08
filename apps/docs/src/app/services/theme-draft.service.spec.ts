import { TestBed } from '@angular/core/testing';
import { ThemeDraftService } from './theme-draft.service';
import { BUILT_IN_THEMES } from '../lib/theme/built-in-themes';
import type { ColorSlot } from '../lib/theme/types';

describe('ThemeDraftService', () => {
  let svc: ThemeDraftService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ThemeDraftService);
  });

  test('starts with a blank draft', () => {
    expect(svc.draft().name).toBe('');
  });

  test('loadFork seeds draft from a built-in', () => {
    svc.loadFork('kouji');
    expect(svc.draft().colors.primary).toBe(BUILT_IN_THEMES.kouji.colors.primary);
    expect(svc.draft().name).toBe('kouji-fork');
  });

  test('save blocks built-in names', () => {
    svc.loadFork('kouji');
    svc.setName('kouji');
    const result = svc.save();
    expect(result).toEqual({ ok: false, reason: 'reserved' });
  });

  test('save persists a new theme to localStorage', () => {
    svc.loadFork('kouji');
    svc.setName('my-cool-theme');
    const result = svc.save();
    expect(result.ok).toBe(true);
    expect(svc.list().map(t => t.name)).toContain('my-cool-theme');
  });

  test('save with same name overwrites', () => {
    svc.loadFork('dark'); svc.setName('mine'); svc.save();
    svc.setColor('primary', 'oklch(50% 0.1 0)');
    svc.save();
    expect(svc.list().filter(t => t.name === 'mine').length).toBe(1);
    expect(svc.list().find(t => t.name === 'mine')!.colors.primary).toBe('oklch(50% 0.1 0)');
  });

  test('loadSaved restores a saved theme into the draft', () => {
    svc.loadFork('dark'); svc.setName('mine'); svc.save();
    svc.loadFork('light');                                        // change draft
    expect(svc.draft().name).toBe('light-fork');
    svc.loadSaved('mine');
    expect(svc.draft().name).toBe('mine');
  });

  test('delete removes the theme; if active, draft falls back to blank', () => {
    svc.loadFork('dark'); svc.setName('mine'); svc.save();
    svc.delete('mine');
    expect(svc.list().map(t => t.name)).not.toContain('mine');
    expect(svc.draft().name).toBe('');
  });

  test('setColor mutates the draft', () => {
    svc.loadFork('light');
    svc.setColor('primary', 'oklch(50% 0.1 0)');
    expect(svc.draft().colors.primary).toBe('oklch(50% 0.1 0)');
  });
});

describe('ThemeDraftService — palette extensions', () => {
  let svc: ThemeDraftService;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ThemeDraftService);
  });

  test('setColors replaces all 9 slots and clears dirty set', () => {
    svc.setColor('primary', '#aabbcc');
    svc.setColors({
      'base-100': '#ffffff', primary: '#3366cc', secondary: '#6633cc',
      accent: '#cc6633', neutral: '#888888', info: '#1166aa',
      success: '#229944', warning: '#aa7700', destructive: '#aa2233',
    });
    expect(svc.draft().colors.primary).toBe('#3366cc');
    expect(svc.dirtySlots().size).toBe(0);
  });

  test('setColor marks the slot dirty', () => {
    svc.setColor('primary', '#123456');
    expect(svc.dirtySlots().has('primary')).toBe(true);
  });

  test('rederiveFromPrimary preserves dirty slots by default', () => {
    svc.loadFork('kouji');
    const before = svc.draft().colors.accent;
    svc.setColor('accent', '#abc123');
    svc.rederiveFromPrimary();
    expect(svc.draft().colors.accent).toBe('#abc123');
  });

  test('rederiveFromPrimary with overwriteDirty:true overwrites manual edits', () => {
    svc.loadFork('kouji');
    svc.setColor('accent', '#abc123');
    svc.rederiveFromPrimary({ overwriteDirty: true });
    expect(svc.draft().colors.accent).not.toBe('#abc123');
  });

  test('loadFork clears dirty set', () => {
    svc.setColor('primary', '#abcdef');
    svc.loadFork('kouji');
    expect(svc.dirtySlots().size).toBe(0);
  });
});
