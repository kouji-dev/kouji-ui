import { Component, ChangeDetectionStrategy, DestroyRef, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { converter, formatHex } from 'culori';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';
import { KjInputComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { ClipboardService } from '../../services/clipboard.service';
import { FontLoaderService } from '../../services/font-loader.service';
import { serializeToScopedBlock } from '../../lib/theme/serialize-theme';
import { CURATED_FONTS, type CuratedFont } from '../../lib/theme/font-catalog';
import type { ColorSlot, ShapeKey, FontKey, MotionKey } from '../../lib/theme/types';

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
  imports: [DocsSidebarComponent, KjInputComponent],
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
    const css = serializeToScopedBlock(this.draft().name || 'custom', this.draftService.resolvedTokens());
    const ok = await this.clipboard.copy(css);
    this.flash(ok ? 'CSS copied to clipboard' : 'Copy failed');
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
