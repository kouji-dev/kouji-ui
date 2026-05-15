import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  KjButtonComponent,
  KjColorPickerComponent,
  KjOptionComponent,
  KjSelectComponent,
  KjSliderComponent,
} from '@kouji-ui/components';
import { ThemeDraftService } from '../../../services/theme-draft.service';
import { FontLoaderService } from '../../../services/font-loader.service';
import { BUILT_IN_NAMES, type BuiltInName } from '../../../lib/theme/built-in-themes';
import { oklchToHex } from '../../../lib/theme/theme-color-utils';
import { CURATED_FONTS, type CuratedFont } from '../../../lib/theme/font-catalog';
import type { BgSlot, FgSlot, FontKey } from '../../../lib/theme/types';

interface ColorRow {
  label: string;
  hex: string;
  set: (v: string) => void;
}

/**
 * Left-rail Controls panel — sections Colors / Type / Shape / Spacing / Motion.
 *
 * The panel reads from {@link ThemeDraftService} and writes back through its
 * setters. Colors are normalized to hex for the color-picker control; the
 * service still stores whatever the picker emits (hex strings are valid for
 * the draft schema).
 */
@Component({
  selector: 'kj-theme-controls-panel',
  standalone: true,
  imports: [
    FormsModule,
    KjButtonComponent,
    KjColorPickerComponent,
    KjSelectComponent,
    KjOptionComponent,
    KjSliderComponent,
  ],
  templateUrl: './controls-panel.html',
  styleUrl: './controls-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlsPanel {
  private readonly draftService = inject(ThemeDraftService);
  private readonly fontLoader = inject(FontLoaderService);

  protected readonly draft = this.draftService.draft;
  protected readonly forkedPreset = this.draftService.forkedPreset;
  protected readonly mode = signal<'simple' | 'full'>('simple');
  protected readonly builtInNames = BUILT_IN_NAMES;
  protected readonly fonts: readonly CuratedFont[] = CURATED_FONTS;

  /** Color rows for Simple mode: body, primary, accent. */
  protected readonly simpleColors = computed<ColorRow[]>(() => {
    const d = this.draft();
    return [
      { label: 'background', hex: oklchToHex(d.bg['bg-body']),   set: (v) => this.setBg('bg-body', v) },
      { label: 'primary',    hex: oklchToHex(d.bg['bg-primary']), set: (v) => this.setBg('bg-primary', v) },
      { label: 'accent',     hex: oklchToHex(d.bg['bg-accent']),  set: (v) => this.setBg('bg-accent', v) },
    ];
  });

  /** Color rows for Full mode: every surface, intent, and on-fg slot. */
  protected readonly fullBgRows = computed<ColorRow[]>(() => {
    const d = this.draft();
    const rows: { slot: BgSlot; label: string }[] = [
      { slot: 'bg-body',     label: 'bg-body' },
      { slot: 'bg-surface',  label: 'bg-surface' },
      { slot: 'bg-field',    label: 'bg-field' },
      { slot: 'bg-elevated', label: 'bg-elevated' },
      { slot: 'bg-primary',  label: 'bg-primary' },
      { slot: 'bg-accent',   label: 'bg-accent' },
      { slot: 'bg-info',     label: 'bg-info' },
      { slot: 'bg-success',  label: 'bg-success' },
      { slot: 'bg-warning',  label: 'bg-warning' },
      { slot: 'bg-danger',   label: 'bg-danger' },
    ];
    return rows.map(r => ({ label: r.label, hex: oklchToHex(d.bg[r.slot]), set: (v: string) => this.setBg(r.slot, v) }));
  });

  protected readonly fullFgRows = computed<ColorRow[]>(() => {
    const d = this.draft();
    const rows: { slot: FgSlot; label: string }[] = [
      { slot: 'fg-default',    label: 'fg-default' },
      { slot: 'fg-on-primary', label: 'fg-on-primary' },
      { slot: 'fg-on-accent',  label: 'fg-on-accent' },
      { slot: 'fg-on-info',    label: 'fg-on-info' },
      { slot: 'fg-on-success', label: 'fg-on-success' },
      { slot: 'fg-on-warning', label: 'fg-on-warning' },
      { slot: 'fg-on-danger',  label: 'fg-on-danger' },
    ];
    return rows.map(r => ({ label: r.label, hex: oklchToHex(d.fg[r.slot]), set: (v: string) => this.setFg(r.slot, v) }));
  });

  protected readonly bodyRem = computed(() => this.draft().typography.bodyRem);

  protected fontIdFor(key: FontKey): string {
    const family = this.draft().type[key];
    return CURATED_FONTS.find(f => family.includes(f.family))?.id ?? 'system-ui';
  }

  protected setMode(m: 'simple' | 'full'): void {
    this.mode.set(m);
  }

  protected fork(name: unknown): void {
    if (typeof name !== 'string') return;
    if (!(BUILT_IN_NAMES as readonly string[]).includes(name)) return;
    this.draftService.loadFork(name as BuiltInName);
  }

  protected reset(): void {
    this.draftService.resetToOriginal();
  }

  protected setBg(slot: BgSlot, value: string): void {
    if (!value) return;
    this.draftService.setBg(slot, value);
  }

  protected setFg(slot: FgSlot, value: string): void {
    if (!value) return;
    this.draftService.setFg(slot, value);
  }

  protected onFont(key: FontKey, fontId: unknown): void {
    if (typeof fontId !== 'string' || fontId === '') return;
    const font = CURATED_FONTS.find(f => f.id === fontId);
    if (!font) return;
    this.fontLoader.ensureLoaded(fontId);
    const stack =
      font.category === 'mono'
        ? `'${font.family}', monospace`
        : font.category === 'serif'
          ? `'${font.family}', serif`
          : `'${font.family}', system-ui, sans-serif`;
    this.draftService.setFont(key, stack);
  }

  protected onRadius(value: number): void {
    this.draftService.setShape('radiusBox', value);
    this.draftService.setShape('radiusField', value);
  }

  protected onBorder(value: number): void {
    this.draftService.setShape('border', value);
  }

  protected onDepth(value: number): void {
    this.draftService.setShape('depth', value);
  }

  protected onBodyRem(value: number): void {
    this.draftService.setTypography('bodyRem', value);
    this.draftService.setTypography('smallRem', Math.max(0.6, +(value * 0.875).toFixed(3)));
  }

  protected onMotion(value: string): void {
    this.draftService.setMotion('transition', value);
  }

  protected motionMs(): number {
    const t = this.draft().motion.transition;
    const m = /([0-9.]+)\s*s/.exec(t);
    if (!m) return 0;
    return Math.round(parseFloat(m[1]) * 1000);
  }

  protected onMotionMs(ms: number): void {
    if (ms <= 0) { this.draftService.setMotion('transition', '0s'); return; }
    const easing = /ease[^,]*/.exec(this.draft().motion.transition)?.[0] ?? 'ease';
    this.draftService.setMotion('transition', `${(ms / 1000).toFixed(2)}s ${easing}`);
  }

  protected currentEasing(): string {
    const t = this.draft().motion.transition;
    if (t === '0s') return 'none';
    const m = /(ease(?:-in-out|-in|-out)?|linear)/.exec(t);
    return m ? m[1] : 'ease';
  }

  protected setEasing(easing: string): void {
    if (easing === 'none') { this.draftService.setMotion('transition', '0s'); return; }
    const ms = this.motionMs();
    const sec = ms > 0 ? (ms / 1000).toFixed(2) : '0.2';
    this.draftService.setMotion('transition', `${sec}s ${easing}`);
  }
}
