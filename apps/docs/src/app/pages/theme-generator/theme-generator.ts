import { Component, ChangeDetectionStrategy, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { converter, formatHex } from 'culori';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';
import { KjInputComponent, KjButtonComponent } from '@kouji-ui/components';
import { ThemeGeneratorPreviewComponent } from './preview/theme-generator-preview';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { BUILT_IN_NAMES } from '../../lib/theme/built-in-themes';
import { ClipboardService } from '../../services/clipboard.service';
import { FontLoaderService } from '../../services/font-loader.service';
import { serializeToScopedBlock } from '../../lib/theme/serialize-theme';
import { CURATED_FONTS, type CuratedFont } from '../../lib/theme/font-catalog';
import type { ColorSlot, ContentSlot, ShapeKey, FontKey, MotionKey } from '../../lib/theme/types';

const STYLE_TAG_ID = 'kj-draft-style';
const COLOR_SLOTS: readonly ColorSlot[] = [
  'base-100', 'primary', 'secondary', 'accent', 'neutral',
  'info', 'success', 'warning', 'destructive',
];

const toOklch = converter('oklch');
const toRgb   = converter('rgb');

function hexToOklch(hex: string): string {
  const c = toOklch(hex);
  if (!c) return 'oklch(50% 0 0)';
  return `oklch(${Math.round((c.l ?? 0) * 100)}% ${(c.c ?? 0).toFixed(3)} ${Math.round(c.h ?? 0)})`;
}
function oklchToHex(css: string): string {
  const rgb = toRgb(css);
  if (!rgb) return '#000000';
  return formatHex(rgb);
}

@Component({
  selector: 'kj-theme-generator',
  standalone: true,
  imports: [DocsSidebarComponent, KjInputComponent, KjButtonComponent, ThemeGeneratorPreviewComponent],
  templateUrl: './theme-generator.html',
  styleUrl: './theme-generator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorComponent {
  private readonly draftService = inject(ThemeDraftService);
  private readonly clipboard = inject(ClipboardService);
  private readonly fontLoader = inject(FontLoaderService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly draft = this.draftService.draft;
  protected readonly colorSlots = COLOR_SLOTS;
  protected readonly fonts: readonly CuratedFont[] = CURATED_FONTS;
  protected readonly toast = signal<string | null>(null);

  /** Validation message for the theme-name input (null = valid). */
  protected readonly nameError = computed<string | null>(() => {
    const n = this.draft().name;
    if (!n) return null;
    if ((BUILT_IN_NAMES as readonly string[]).includes(n)) return 'Reserved built-in name';
    if (n.length > 32) return 'Max 32 characters';
    if (!/^[a-z0-9-]+$/.test(n)) return 'Use lowercase letters, digits, and hyphens';
    return null;
  });

  /** True when Save should be disabled (no name or invalid name). */
  protected readonly saveDisabled = computed(() => !this.draft().name || this.nameError() !== null);

  // Inject/update the scoped draft style block — created in injection context (constructor field).
  // Runs in the browser only; jsdom tests skip via the typeof check.
  private readonly styleSync = effect(() => {
    const css = this.draftService.css();
    if (typeof document === 'undefined') return;
    let tag = this.document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
    if (!tag) {
      tag = this.document.createElement('style');
      tag.id = STYLE_TAG_ID;
      this.document.head.appendChild(tag);
    }
    tag.textContent = css;
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.document.getElementById(STYLE_TAG_ID)?.remove();
    });
  }

  protected hexFor(slot: ColorSlot): string {
    return oklchToHex(this.draft().colors[slot]);
  }
  protected onColorChange(slot: ColorSlot, hex: string): void {
    this.draftService.setColor(slot, hexToOklch(hex));
  }

  /** Resolved content color for a slot, plus whether the user has overridden it. */
  protected contentFor(slot: ColorSlot): { value: string; isOverride: boolean } {
    const key: ContentSlot = slot === 'base-100' ? 'base-content' : `${slot}-content` as ContentSlot;
    return {
      value: this.draftService.resolvedTokens().contents[key],
      isOverride: !!this.draft().contentOverrides[key],
    };
  }
  protected hexForContent(slot: ColorSlot): string {
    return oklchToHex(this.contentFor(slot).value);
  }
  protected toggleContentOverride(slot: ColorSlot): void {
    const key: ContentSlot = slot === 'base-100' ? 'base-content' : `${slot}-content` as ContentSlot;
    if (this.draft().contentOverrides[key]) {
      this.draftService.setContentOverride(key, null);
    } else {
      this.draftService.setContentOverride(key, this.contentFor(slot).value);
    }
  }
  protected onContentChange(slot: ColorSlot, hex: string): void {
    const key: ContentSlot = slot === 'base-100' ? 'base-content' : `${slot}-content` as ContentSlot;
    this.draftService.setContentOverride(key, hexToOklch(hex));
  }

  protected onNameChange(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value
      .toLowerCase().trim().replace(/\s+/g, '-').slice(0, 32);
    this.draftService.setName(v);
  }

  protected save(): void {
    const result = this.draftService.save();
    this.flash(result.ok ? `Saved "${this.draft().name}"`
                         : result.reason === 'reserved'
                           ? 'That name is reserved by a built-in theme'
                           : 'Pick a name first');
  }

  protected reset(): void {
    this.draftService.resetToOriginal();
    this.flash('Reset');
  }

  async copyCss(): Promise<void> {
    const ok = await this.clipboard.copy(this.exportedCss());
    this.flash(ok ? 'CSS copied to clipboard' : 'Copy failed');
  }

  downloadCss(): void {
    const filename = `${this.draft().name || 'custom'}.kj-theme.css`;
    this.download(filename, this.exportedCss(), 'text/css');
  }

  exportJson(): void {
    const filename = `${this.draft().name || 'custom'}.kj-theme.json`;
    this.download(filename, JSON.stringify(this.draft(), null, 2), 'application/json');
  }

  /** Full CSS export: @import lines for any used Google Font + the scoped block. */
  private exportedCss(): string {
    const name = this.draft().name || 'custom';
    const importLines = this.fontImports();
    return [importLines, serializeToScopedBlock(name, this.draftService.resolvedTokens())]
      .filter(Boolean).join('\n\n');
  }

  private fontImports(): string {
    const used = new Set<string>();
    for (const k of ['fontSans', 'fontMono', 'fontDisplay'] as const) {
      const family = this.draft().type[k];
      const f = CURATED_FONTS.find(c => family.includes(c.family));
      if (f && f.query) used.add(`@import url('https://fonts.googleapis.com/css2?${f.query}&display=swap');`);
    }
    return [...used].join('\n');
  }

  private download(filename: string, content: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = this.document.createElement('a');
    a.href = url; a.download = filename;
    this.document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ── shape / type / motion handlers ──────────────────────────────────

  protected fontIdFor(key: FontKey): string {
    const family = this.draft().type[key];
    return CURATED_FONTS.find(f => family.includes(f.family))?.id ?? 'system-ui';
  }

  protected onShape(key: ShapeKey, value: number): void {
    this.draftService.setShape(key, value);
  }
  protected onFont(key: FontKey, fontId: string): void {
    const font = CURATED_FONTS.find(f => f.id === fontId);
    if (!font) return;
    this.fontLoader.ensureLoaded(fontId);
    const stack = font.category === 'mono'
      ? `'${font.family}', monospace`
      : font.category === 'serif'
        ? `'${font.family}', serif`
        : `'${font.family}', system-ui, sans-serif`;
    this.draftService.setFont(key, stack);
  }
  protected onMotion(key: MotionKey, value: string): void {
    this.draftService.setMotion(key, value);
  }

  private flash(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2500);
  }
}
