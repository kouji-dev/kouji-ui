import { Injectable, computed, signal } from '@angular/core';
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
import type { DraftTheme, ColorSlot, ContentSlot, ShapeKey, FontKey, MotionKey, TypographyKey } from '../lib/theme/types';

const STORAGE_KEY = 'kj-custom-themes';
const DRAFT_KEY   = 'kj-draft-current';

interface StoredEnvelope { version: 1; themes: SavedTheme[] }
export interface SavedTheme extends DraftTheme { savedAt: number }

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'reserved' | 'invalid-name' };

const BLANK_DRAFT: DraftTheme = {
  name: '',
  colors: { ...BUILT_IN_THEMES.light.colors },
  contentOverrides: {},
  shape:      { ...BUILT_IN_THEMES.light.shape },
  type:       { ...BUILT_IN_THEMES.light.type },
  typography: { ...BUILT_IN_THEMES.light.typography },
  motion:     { ...BUILT_IN_THEMES.light.motion },
};

@Injectable({ providedIn: 'root' })
export class ThemeDraftService {
  private readonly _draft = signal<DraftTheme>(this.readDraft() ?? structuredClone(BLANK_DRAFT));
  readonly draft = this._draft.asReadonly();

  private readonly _dirty = signal<Set<ColorSlot>>(new Set());
  readonly dirtySlots = this._dirty.asReadonly();

  readonly resolvedTokens = computed(() => deriveTokens(this._draft()));
  readonly css = computed(() => serializeToScopedBlock('custom-draft', this.resolvedTokens()));

  loadFork(name: BuiltInName): void {
    const src = BUILT_IN_THEMES[name];
    this._draft.set({ ...structuredClone(src), name: `${name}-fork` });
    this._dirty.set(new Set());
    this.persistDraft();
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

  setColor(slot: ColorSlot, value: string): void {
    this._draft.update(d => ({ ...d, colors: { ...d.colors, [slot]: value } }));
    this._dirty.update(s => { const n = new Set(s); n.add(slot); return n; });
    this.persistDraft();
  }

  setColors(colors: Record<ColorSlot, string>): void {
    this._draft.update(d => ({ ...d, colors: { ...colors } }));
    this._dirty.set(new Set());
    this.persistDraft();
  }

  /** Random curated palette (weighted hue family). Optionally shuffle radii, border, depth, and motion — DaisyUI-style “surprise theme”.
   * Clears all manual surface/content overrides so every shuffle is a full reset. */
  applyRandomInspiration(opts: { includeShape?: boolean; random?: () => number } = {}): void {
    const rnd = opts.random ?? Math.random;
    const palette = randomAccessiblePalette({ random: rnd });
    this._draft.update(d => {
      const next: DraftTheme = {
        ...d,
        colors: palette,
        contentOverrides: {},
      };
      if (opts.includeShape) {
        next.shape = { ...d.shape, ...randomShapeSnapshot(rnd) };
        next.motion = { transition: randomMotionTransition(rnd) };
      }
      return next;
    });
    this._dirty.set(new Set());
    this.persistDraft();
  }

  /** Re-derive secondary/accent/neutral/semantic from current `primary`.
   * Slots the user has manually edited (in `dirtySlots`) are preserved unless
   * `overwriteDirty: true`. */
  rederiveFromPrimary(opts: { overwriteDirty?: boolean; mode?: 'light' | 'dark' } = {}): void {
    const seed = this._draft().colors.primary;
    const derived = deriveFromSeed(seed, { mode: opts.mode ?? 'light' });
    if (opts.overwriteDirty) {
      this.setColors(derived);
      return;
    }
    const dirty = this._dirty();
    const next = { ...this._draft().colors };
    for (const slot of Object.keys(derived) as ColorSlot[]) {
      if (!dirty.has(slot)) next[slot] = derived[slot];
    }
    this._draft.update(d => ({ ...d, colors: next }));
    this.persistDraft();
  }

  setContentOverride(slot: ContentSlot, value: string | null): void {
    this._draft.update(d => {
      const next = { ...d.contentOverrides };
      if (value === null) delete next[slot]; else next[slot] = value;
      return { ...d, contentOverrides: next };
    });
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
    const baseName = name.endsWith('-fork') ? name.slice(0, -5) as BuiltInName : null;
    if (baseName && (BUILT_IN_NAMES as readonly string[]).includes(baseName)) {
      this.loadFork(baseName);
      return;
    }
    const saved = this.list().find(t => t.name === name);
    if (saved) {
      this.loadSaved(name);
      return;
    }
    this._draft.set(structuredClone(BLANK_DRAFT));
    this._dirty.set(new Set());
    this.persistDraft();
  }

  private read(): StoredEnvelope {
    if (typeof localStorage === 'undefined') return { version: 1, themes: [] };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, themes: [] };
    try {
      const parsed = JSON.parse(raw) as StoredEnvelope;
      if (parsed.version !== 1) return { version: 1, themes: [] };
      return parsed;
    } catch { return { version: 1, themes: [] }; }
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
