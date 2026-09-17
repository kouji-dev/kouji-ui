import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { ThemeDraftService } from './theme-draft.service';
import { BUILT_IN_THEMES } from '../lib/theme/built-in-themes';

/**
 * These tests were written against the daisyUI-era `DraftTheme.colors` /
 * `setColor` API and have been rewritten against the 17-slot bg/fg model that
 * replaced it (`BG_SLOTS` + `FG_SLOTS`, `setBg` / `setFg` / `setBgs` /
 * `setFgs`). Behaviour under test is unchanged: forking, saving, dirty-slot
 * tracking and re-derivation.
 */
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
    expect(svc.draft().bg['bg-primary']).toBe(BUILT_IN_THEMES.kouji.bg['bg-primary']);
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
    svc.setBg('bg-primary', 'oklch(50% 0.1 0)');
    svc.save();
    expect(svc.list().filter(t => t.name === 'mine').length).toBe(1);
    expect(svc.list().find(t => t.name === 'mine')!.bg['bg-primary']).toBe('oklch(50% 0.1 0)');
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

  test('setBg mutates the draft', () => {
    svc.loadFork('light');
    svc.setBg('bg-primary', 'oklch(50% 0.1 0)');
    expect(svc.draft().bg['bg-primary']).toBe('oklch(50% 0.1 0)');
  });

  test('setFg mutates the draft', () => {
    svc.loadFork('light');
    svc.setFg('fg-on-primary', '#fefefe');
    expect(svc.draft().fg['fg-on-primary']).toBe('#fefefe');
  });

  test('setShape mirrors radiusField onto radiusSelector', () => {
    svc.loadFork('light');
    svc.setShape('radiusField', 9);
    expect(svc.draft().shape.radiusField).toBe(9);
    expect(svc.draft().shape.radiusSelector).toBe(9);
  });
});

describe('ThemeDraftService — palette extensions', () => {
  let svc: ThemeDraftService;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ThemeDraftService);
  });

  test('setBgs replaces every background slot and clears the dirty set', () => {
    svc.setBg('bg-primary', '#aabbcc');
    expect(svc.dirtySlots().size).toBe(1);
    svc.setBgs({
      'bg-body': '#ffffff', 'bg-surface': '#f7f7f7', 'bg-field': '#ffffff',
      'bg-elevated': '#eeeeee', 'bg-primary': '#3366cc', 'bg-accent': '#6633cc',
      'bg-info': '#1166aa', 'bg-success': '#229944', 'bg-warning': '#aa7700',
      'bg-danger': '#aa2233',
    });
    expect(svc.draft().bg['bg-primary']).toBe('#3366cc');
    expect(svc.dirtySlots().size).toBe(0);
  });

  test('setBg marks the slot dirty', () => {
    svc.setBg('bg-primary', '#123456');
    expect(svc.dirtySlots().has('bg-primary')).toBe(true);
  });

  test('setFg marks the slot dirty', () => {
    svc.setFg('fg-default', '#123456');
    expect(svc.dirtySlots().has('fg-default')).toBe(true);
  });

  test('rederiveFromPrimary preserves dirty slots by default', () => {
    svc.loadFork('kouji');
    svc.setBg('bg-accent', '#abc123');
    svc.rederiveFromPrimary();
    expect(svc.draft().bg['bg-accent']).toBe('#abc123');
  });

  test('rederiveFromPrimary with overwriteDirty:true overwrites manual edits', () => {
    svc.loadFork('kouji');
    svc.setBg('bg-accent', '#abc123');
    svc.rederiveFromPrimary({ overwriteDirty: true });
    expect(svc.draft().bg['bg-accent']).not.toBe('#abc123');
  });

  test('loadFork clears dirty set', () => {
    svc.setBg('bg-primary', '#abcdef');
    svc.loadFork('kouji');
    expect(svc.dirtySlots().size).toBe(0);
  });

  test('applyRandomInspiration replaces the palette and clears the dirty set', () => {
    svc.loadFork('kouji');
    svc.setBg('bg-primary', '#abcdef');
    expect(svc.dirtySlots().size).toBe(1);
    svc.applyRandomInspiration();
    expect(svc.draft().bg['bg-primary']).not.toBe('#abcdef');
    expect(svc.dirtySlots().size).toBe(0);
  });

  test('applyRandomInspiration with includeShape also shuffles shape and motion', () => {
    svc.loadFork('kouji');
    const before = { ...svc.draft().shape };
    let seed = 0;
    svc.applyRandomInspiration({ includeShape: true, random: () => ((seed += 0.37) % 1) });
    const after = svc.draft().shape;
    const changed =
      after.radiusBox !== before.radiusBox ||
      after.radiusField !== before.radiusField ||
      after.border !== before.border ||
      after.depth !== before.depth;
    expect(changed).toBe(true);
    expect(svc.draft().motion.transition).toBeTruthy();
  });
});
