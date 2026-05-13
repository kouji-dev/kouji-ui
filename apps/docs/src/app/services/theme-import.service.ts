import { Injectable, inject } from '@angular/core';
import { ThemeDraftService } from './theme-draft.service';
import { BUILT_IN_THEMES } from '../lib/theme/built-in-themes';
import { DraftThemeSchema } from '../lib/theme/import-schema';
import { BG_SLOTS, FG_SLOTS } from '../lib/theme/types';
import type { DraftTheme, BgSlot, FgSlot } from '../lib/theme/types';

export type ImportResult = { ok: true; draft: DraftTheme } | { ok: false; reason: string };
export type Format = 'json' | 'css';

/** Parses pasted/uploaded theme payloads (JSON or CSS) into draft objects. */
@Injectable({ providedIn: 'root' })
export class ThemeImportService {
  private readonly draftService = inject(ThemeDraftService);

  detectFormat(text: string): Format {
    const t = text.trimStart();
    return t.startsWith('{') ? 'json' : 'css';
  }

  parseJson(text: string): ImportResult {
    let parsed: unknown;
    try { parsed = JSON.parse(text); }
    catch { return { ok: false, reason: 'Not valid JSON' }; }
    const result = DraftThemeSchema.safeParse(parsed);
    if (!result.success) return { ok: false, reason: 'Invalid theme shape' };
    return { ok: true, draft: result.data as DraftTheme };
  }

  parseCss(text: string): ImportResult {
    if (!text.includes('--kj-')) return { ok: false, reason: 'No --kj-* properties found' };
    const draft: DraftTheme = structuredClone(BUILT_IN_THEMES.kouji ?? Object.values(BUILT_IN_THEMES)[0]);
    draft.name = '';
    const re = /--kj-([a-z0-9-]+)\s*:\s*([^;]+);/gi;
    const bgSet = new Set<string>(BG_SLOTS);
    const fgSet = new Set<string>(FG_SLOTS);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const key = m[1].trim();
      const value = m[2].trim();
      const fullKey = `--kj-${key}`;
      if (bgSet.has(`bg-${key.replace(/^bg-/, '')}`) && key.startsWith('bg-')) {
        draft.bg[key as BgSlot] = value;
      } else if (fgSet.has(`fg-${key.replace(/^fg-/, '')}`) && key.startsWith('fg-')) {
        const slot = key as FgSlot;
        if (FG_SLOTS.includes(slot)) {
          draft.fg[slot] = value;
        }
      } else if (key === 'radius-box')      draft.shape.radiusBox = parseFloat(value);
      else if (key === 'radius-field')      draft.shape.radiusField = parseFloat(value);
      else if (key === 'radius-selector')   draft.shape.radiusSelector = parseFloat(value);
      else if (key === 'border')            draft.shape.border = parseFloat(value);
      else if (key === 'depth')             draft.shape.depth = parseFloat(value);
      else if (key === 'font-sans')         draft.type.fontSans = value;
      else if (key === 'font-mono')         draft.type.fontMono = value;
      else if (key === 'font-display')      draft.type.fontDisplay = value;
      else if (key === 'transition')        draft.motion.transition = value;
      void fullKey;
    }
    return { ok: true, draft };
  }

  /** Apply an imported draft via the draft service. */
  apply(draft: DraftTheme): void {
    this.draftService.load(draft);
  }
}
