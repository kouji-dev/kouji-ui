import { Injectable, computed, inject, signal } from '@angular/core';
import { BUILT_IN_THEMES, BUILT_IN_NAMES, type BuiltInName } from '../lib/theme/built-in-themes';
import { deriveTokens } from '../lib/theme/derive-tokens';
import { serializeToScopedBlock } from '../lib/theme/serialize-theme';
import { DraftThemeSchema } from '../lib/theme/import-schema';
import {
  deriveFromSeed,
  randomAccessiblePalette,
  randomMotionTransition,
  randomShapeSnapshot,
} from '../lib/theme/palette-derive';
import { ThemeService } from './theme.service';
import { ThemePresetExtractor } from './theme-preset-extractor.service';
import type {
  BgSlot, FgSlot, DraftTheme, ShapeKey, FontKey, MotionKey, TypographyKey,
} from '../lib/theme/types';

const STORAGE_KEY = 'kj-custom-themes';
const DRAFT_KEY   = 'kj-draft-current';

interface StoredEnvelope { version: 2; themes: SavedTheme[] }
export interface SavedTheme extends DraftTheme { savedAt: number }

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'reserved' | 'invalid-name' };

const BLANK_DRAFT: DraftTheme = {
  name: '',
  bg: { ...BUILT_IN_THEMES.light.bg },
  fg: { ...BUILT_IN_THEMES.light.fg },
  shape:      { ...BUILT_IN_THEMES.light.shape },
  type:       { ...BUILT_IN_THEMES.light.type },
  typography: { ...BUILT_IN_THEMES.light.typography },
  motion:     { ...BUILT_IN_THEMES.light.motion },
};

type AnySlot = BgSlot | FgSlot;

@Injectable({ providedIn: 'root' })
export class ThemeDraftService {
  private readonly themeService = inject(ThemeService);
  private readonly extractor = inject(ThemePresetExtractor);

  /**
   * Source of truth for built-in theme snapshots. In the browser this reads
   * the live theme CSS so a draft is always in sync with whatever the
   * theme stylesheets ship today. The hardcoded `BUILT_IN_THEMES` table
   * remains as the SSR-side fallback and as a stable input for the test
   * suite — the theme-generator route opts out of SSR via
   * `RenderMode.Client`, so the live path is the one users see.
   */
  private fork(name: BuiltInName): DraftTheme {
    const live = this.extractor.extract(name);
    return live ?? structuredClone(BUILT_IN_THEMES[name]);
  }

  /**
   * Initial draft. Priority:
   *  1. Persisted draft from `localStorage` (preserves in-flight tweaks across reloads).
   *  2. Fork of the currently-selected site theme — opening the generator
   *     should always pre-load the theme the user is already looking at,
   *     not a hardcoded `light` baseline.
   *  3. Fallback to `light` (only reachable when the site theme name isn't
   *     a known built-in, which shouldn't happen in practice).
   */
  private readonly _draft = signal<DraftTheme>(this.initialDraft());
  readonly draft = this._draft.asReadonly();

  /**
   * Which built-in preset the current draft was forked from. Drives the
   * "fork from preset" select in the controls panel so the dropdown
   * pre-selects the active site theme on first load (and stays in sync as
   * the user picks a different preset).
   */
  private readonly _forkedPreset = signal<BuiltInName | null>(this.initialForkedPreset());
  readonly forkedPreset = this._forkedPreset.asReadonly();

  private initialDraft(): DraftTheme {
    const stored = this.readDraft();
    if (stored) return stored;
    const active = this.themeService.theme();
    if ((BUILT_IN_NAMES as readonly string[]).includes(active)) {
      return { ...this.fork(active as BuiltInName), name: '' };
    }
    return structuredClone(BLANK_DRAFT);
  }

  private initialForkedPreset(): BuiltInName | null {
    const stored = this.readDraft();
    if (stored) {
      // `loadFork(name)` sets `name = '<preset>-fork'`. Recover the preset
      // from the persisted name so the dropdown stays accurate across reloads.
      const match = stored.name.match(/^([a-z-]+?)-fork$/);
      if (match && (BUILT_IN_NAMES as readonly string[]).includes(match[1])) {
        return match[1] as BuiltInName;
      }
      return null;
    }
    const active = this.themeService.theme();
    return (BUILT_IN_NAMES as readonly string[]).includes(active)
      ? (active as BuiltInName)
      : null;
  }

  private readonly _dirty = signal<Set<AnySlot>>(new Set());
  readonly dirtySlots = this._dirty.asReadonly();

  readonly resolvedTokens = computed(() => deriveTokens(this._draft()));
  readonly css = computed(() => serializeToScopedBlock('custom-draft', this.resolvedTokens()));

  loadFork(name: BuiltInName): void {
    this._draft.set({ ...this.fork(name), name: `${name}-fork` });
    this._dirty.set(new Set());
    this._forkedPreset.set(name);
    this.persistDraft();
  }

  /**
   * Re-seed the draft from the currently-active site theme — but only if
   * the user hasn't made manual edits. Called when the theme-generator
   * route mounts so re-visiting after a site-theme change shows the new
   * theme's tokens, while still preserving an in-flight edit session.
   *
   * Returns `true` when the draft was refreshed.
   */
  refreshFromActiveThemeIfClean(): boolean {
    if (this._dirty().size > 0) return false;
    const active = this.themeService.theme();
    if (!(BUILT_IN_NAMES as readonly string[]).includes(active)) return false;
    const name = active as BuiltInName;
    this._draft.set({ ...this.fork(name), name: '' });
    this._forkedPreset.set(name);
    this.persistDraft();
    return true;
  }

  /** Replace the entire draft (e.g. from a URL hash or import payload). Clears dirty set. */
  load(draft: DraftTheme): void {
    this._draft.set(structuredClone(draft));
    this._dirty.set(new Set());
    this.persistDraft();
  }

  loadSaved(name: string): void {
    const found = this.list().find(t => t.name === name);
    if (!found) return;
    const { savedAt: _omit, ...rest } = found;
    this._draft.set(structuredClone(rest));
    this._dirty.set(new Set());
    this.persistDraft();
  }

  setName(name: string): void {
    this._draft.update(d => ({ ...d, name }));
    this.persistDraft();
  }

  setBg(slot: BgSlot, value: string): void {
    this._draft.update(d => ({ ...d, bg: { ...d.bg, [slot]: value } }));
    this._dirty.update(s => { const n = new Set(s); n.add(slot); return n; });
    this.persistDraft();
  }

  setFg(slot: FgSlot, value: string): void {
    this._draft.update(d => ({ ...d, fg: { ...d.fg, [slot]: value } }));
    this._dirty.update(s => { const n = new Set(s); n.add(slot); return n; });
    this.persistDraft();
  }

  setBgs(bg: Record<BgSlot, string>): void {
    this._draft.update(d => ({ ...d, bg: { ...bg } }));
    this._dirty.set(new Set());
    this.persistDraft();
  }

  setFgs(fg: Record<FgSlot, string>): void {
    this._draft.update(d => ({ ...d, fg: { ...fg } }));
    this._dirty.set(new Set());
    this.persistDraft();
  }

  /**
   * Random curated palette (weighted hue family). Optionally shuffle radii,
   * border, depth, and motion — DaisyUI-style "surprise theme". Clears all
   * manual overrides so every shuffle is a full reset.
   */
  applyRandomInspiration(opts: { includeShape?: boolean; random?: () => number } = {}): void {
    const rnd = opts.random ?? Math.random;
    const { bg, fg } = randomAccessiblePalette({ random: rnd });
    this._draft.update(d => {
      const next: DraftTheme = { ...d, bg, fg };
      if (opts.includeShape) {
        next.shape = { ...d.shape, ...randomShapeSnapshot(rnd) };
        next.motion = { transition: randomMotionTransition(rnd) };
      }
      return next;
    });
    this._dirty.set(new Set());
    this.persistDraft();
  }

  /**
   * Re-derive every slot from the current `bg-primary`. Slots the user has
   * manually edited (in `dirtySlots`) are preserved unless `overwriteDirty: true`.
   */
  rederiveFromPrimary(opts: { overwriteDirty?: boolean; mode?: 'light' | 'dark' } = {}): void {
    const seed = this._draft().bg['bg-primary'];
    const derived = deriveFromSeed(seed, { mode: opts.mode ?? 'light' });
    if (opts.overwriteDirty) {
      this.setBgs(derived.bg);
      this.setFgs(derived.fg);
      return;
    }
    const dirty = this._dirty();
    const nextBg = { ...this._draft().bg };
    const nextFg = { ...this._draft().fg };
    for (const slot of Object.keys(derived.bg) as BgSlot[]) {
      if (!dirty.has(slot)) nextBg[slot] = derived.bg[slot];
    }
    for (const slot of Object.keys(derived.fg) as FgSlot[]) {
      if (!dirty.has(slot)) nextFg[slot] = derived.fg[slot];
    }
    this._draft.update(d => ({ ...d, bg: nextBg, fg: nextFg }));
    this.persistDraft();
  }

  setShape(key: ShapeKey, value: number): void {
    this._draft.update(d => {
      const shape = { ...d.shape, [key]: value };
      if (key === 'radiusField') {
        shape.radiusSelector = value;
      }
      return { ...d, shape };
    });
    this.persistDraft();
  }

  setFont(key: FontKey, value: string): void {
    this._draft.update(d => ({ ...d, type: { ...d.type, [key]: value } }));
    this.persistDraft();
  }

  setMotion(key: MotionKey, value: string): void {
    this._draft.update(d => ({ ...d, motion: { ...d.motion, [key]: value } }));
    this.persistDraft();
  }

  setTypography(key: TypographyKey, value: number): void {
    this._draft.update(d => ({ ...d, typography: { ...d.typography, [key]: value } }));
    this.persistDraft();
  }

  save(): SaveResult {
    const d = this._draft();
    if (!d.name || d.name.length > 32) return { ok: false, reason: 'invalid-name' };
    if ((BUILT_IN_NAMES as readonly string[]).includes(d.name)) return { ok: false, reason: 'reserved' };

    const env = this.read();
    const idx = env.themes.findIndex(t => t.name === d.name);
    const entry: SavedTheme = { ...structuredClone(d), savedAt: Date.now() };
    if (idx >= 0) env.themes[idx] = entry; else env.themes.push(entry);
    this.write(env);
    return { ok: true };
  }

  delete(name: string): void {
    const env = this.read();
    env.themes = env.themes.filter(t => t.name !== name);
    this.write(env);
    if (this._draft().name === name) {
      this._draft.set(structuredClone(BLANK_DRAFT));
      this._dirty.set(new Set());
      this.persistDraft();
    }
  }

  list(): SavedTheme[] {
    return this.read().themes;
  }

  /** Load a draft from a JSON string (e.g., file contents). Validated via Zod. */
  importJson(text: string): { ok: true } | { ok: false; reason: string } {
    let parsed: unknown;
    try { parsed = JSON.parse(text); }
    catch { return { ok: false, reason: 'Not valid JSON' }; }
    const result = DraftThemeSchema.safeParse(parsed);
    if (!result.success) return { ok: false, reason: 'Invalid theme shape' };
    this._draft.set(result.data as DraftTheme);
    this._dirty.set(new Set());
    this.persistDraft();
    return { ok: true };
  }

  resetToOriginal(): void {
    const name = this._draft().name;

    // 1. Saved user theme — restore the persisted version.
    const saved = this.list().find(t => t.name === name);
    if (saved) {
      this.loadSaved(name);
      return;
    }

    // 2. Forked draft — re-fork from the preset the user picked.
    //    Prefer the explicit `_forkedPreset` signal (set by loadFork /
    //    refresh), and fall back to the legacy `<name>-fork` convention
    //    for drafts created before the signal existed.
    const preset = this._forkedPreset()
      ?? (name.endsWith('-fork') ? (name.slice(0, -5) as BuiltInName) : null);
    if (preset && (BUILT_IN_NAMES as readonly string[]).includes(preset)) {
      this.loadFork(preset);
      return;
    }

    // 3. Last resort — fall back to a freshly-extracted active site theme.
    //    Better than blanking to BLANK_DRAFT (which always lands on light),
    //    keeps the reset behaviour aligned with "what the user is looking
    //    at right now".
    const active = this.themeService.theme();
    if ((BUILT_IN_NAMES as readonly string[]).includes(active)) {
      this.loadFork(active as BuiltInName);
      return;
    }

    this._draft.set(structuredClone(BLANK_DRAFT));
    this._dirty.set(new Set());
    this._forkedPreset.set(null);
    this.persistDraft();
  }

  private read(): StoredEnvelope {
    if (typeof localStorage === 'undefined') return { version: 2, themes: [] };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 2, themes: [] };
    try {
      const parsed = JSON.parse(raw) as StoredEnvelope;
      if (parsed.version !== 2) return { version: 2, themes: [] };
      return parsed;
    } catch { return { version: 2, themes: [] }; }
  }
  private write(env: StoredEnvelope): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(env));
  }
  private readDraft(): DraftTheme | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as DraftTheme;
      // Reject pre-migration drafts; they lack the bg/fg shape.
      if (!parsed.bg || !parsed.fg) return null;
      return {
        ...parsed,
        typography: parsed.typography ?? { ...BUILT_IN_THEMES.light.typography },
      };
    } catch { return null; }
  }
  private persistDraft(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(this._draft()));
  }
}
