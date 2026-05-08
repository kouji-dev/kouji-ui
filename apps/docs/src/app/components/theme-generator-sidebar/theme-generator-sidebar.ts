import { Component, ChangeDetectionStrategy, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs/operators';
import { converter, formatHex } from 'culori';
import { KjInputComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { FontLoaderService } from '../../services/font-loader.service';
import { SidebarToggleService } from '../../services/sidebar-toggle.service';
import { BUILT_IN_NAMES, type BuiltInName } from '../../lib/theme/built-in-themes';
import { CURATED_FONTS, type CuratedFont } from '../../lib/theme/font-catalog';
import { deriveFromSeed, randomAccessiblePalette } from '../../lib/theme/palette-derive';
import { SeedSwatchGrid } from '../seed-swatch-grid/seed-swatch-grid';
import { ContrastScorecard } from '../contrast-scorecard/contrast-scorecard';
import type { ColorSlot, ContentSlot, ShapeKey, FontKey, MotionKey } from '../../lib/theme/types';

const COLOR_SLOTS: readonly ColorSlot[] = [
  'base-100', 'primary', 'secondary', 'accent', 'neutral',
  'info', 'success', 'warning', 'destructive',
];

const DERIVED_SLOTS: readonly ContentSlot[] = ['base-200', 'base-300', 'base-content'];

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
  selector: 'kj-theme-generator-sidebar',
  standalone: true,
  imports: [KjInputComponent, SeedSwatchGrid, ContrastScorecard],
  templateUrl: './theme-generator-sidebar.html',
  styleUrl: './theme-generator-sidebar.css',
  host: { '[class.open]': 'toggleService.open()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorSidebarComponent {
  private readonly draftService = inject(ThemeDraftService);
  private readonly fontLoader = inject(FontLoaderService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly toggleService = inject(SidebarToggleService);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.toggleService.close());
  }

  protected readonly builtIns = BUILT_IN_NAMES;
  protected readonly mySaved = computed(() => this.draftService.list().map(t => t.name));
  protected readonly currentName = computed(() => this.draftService.draft().name);

  /** Returns the built-in name a fork is based on (e.g. "retro-fork" → "retro"), or the name itself. */
  protected readonly activeBase = computed<string>(() => {
    const n = this.currentName();
    if (n.endsWith('-fork')) {
      const base = n.slice(0, -5);
      if ((BUILT_IN_NAMES as readonly string[]).includes(base as BuiltInName)) return base;
    }
    return n;
  });

  // ── Col B — token editor state ───────────────────────────────────────
  protected readonly draft = this.draftService.draft;
  protected readonly colorSlots = COLOR_SLOTS;
  protected readonly derivedSlots = DERIVED_SLOTS;
  protected readonly fonts: readonly CuratedFont[] = CURATED_FONTS;

  // ── Col A — handlers ─────────────────────────────────────────────────
  protected onForkBuiltIn(name: BuiltInName): void { this.draftService.loadFork(name); }
  protected onLoadSaved(name: string): void { this.draftService.loadSaved(name); }
  protected onNewTheme(): void { this.draftService.loadFork('light'); this.draftService.setName(''); }

  // ── Col B — seed grid / palette actions ───────────────────────────────
  protected readonly activeSeed = computed<string | null>(() => {
    if (this.draftService.dirtySlots().size > 0) return null;
    return this.draft().colors.primary;
  });

  protected onSeedPicked(hex: string): void {
    const derived = deriveFromSeed(hex, { mode: 'light' });
    this.draftService.setColors(derived);
  }

  protected randomize(): void {
    this.draftService.setColors(randomAccessiblePalette());
  }

  protected rederive(): void {
    this.draftService.rederiveFromPrimary();
  }

  // ── Col B — color handlers ────────────────────────────────────────────
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

  /** Resolved value for a derived slot (base-200, base-300, base-content), plus override flag. */
  protected derivedFor(slot: ContentSlot): { value: string; isOverride: boolean } {
    const tokens = this.draftService.resolvedTokens();
    let value: string;
    if (slot === 'base-200') {
      value = tokens.derivedBase.base200;
    } else if (slot === 'base-300') {
      value = tokens.derivedBase.base300;
    } else {
      value = tokens.contents[slot];
    }
    return { value, isOverride: !!this.draft().contentOverrides[slot] };
  }
  protected hexForDerived(slot: ContentSlot): string {
    return oklchToHex(this.derivedFor(slot).value);
  }
  protected toggleDerivedOverride(slot: ContentSlot): void {
    if (this.draft().contentOverrides[slot]) {
      this.draftService.setContentOverride(slot, null);
    } else {
      this.draftService.setContentOverride(slot, this.derivedFor(slot).value);
    }
  }
  protected onDerivedChange(slot: ContentSlot, hex: string): void {
    this.draftService.setContentOverride(slot, hexToOklch(hex));
  }

  // ── Col B — shape / type / motion handlers ────────────────────────────
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
}
