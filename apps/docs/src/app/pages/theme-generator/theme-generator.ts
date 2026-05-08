import { Component, ChangeDetectionStrategy, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { KjButtonComponent } from '@kouji-ui/components';
import { ThemeGeneratorPreviewComponent } from './preview/theme-generator-preview';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { BUILT_IN_NAMES } from '../../lib/theme/built-in-themes';
import { ClipboardService } from '../../services/clipboard.service';
import { FontLoaderService } from '../../services/font-loader.service';
import { serializeToScopedBlock } from '../../lib/theme/serialize-theme';
import { CURATED_FONTS } from '../../lib/theme/font-catalog';
import { ThemeUrlService } from '../../services/theme-url.service';
import { ThemeImportDialog } from '../../components/theme-import-dialog/theme-import-dialog';

const STYLE_TAG_ID = 'kj-draft-style';

@Component({
  selector: 'kj-theme-generator',
  standalone: true,
  imports: [KjButtonComponent, ThemeGeneratorPreviewComponent, ThemeImportDialog],
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
  private readonly url = inject(ThemeUrlService);

  protected readonly draft = this.draftService.draft;
  protected readonly toast = signal<string | null>(null);
  protected readonly importOpen = signal(false);

  protected openImport(): void { this.importOpen.set(true); }
  protected onImportClosed(ev: { imported: boolean }): void {
    this.importOpen.set(false);
    if (ev.imported) this.flash('Imported');
  }

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
    this.url.startSync();
    this.destroyRef.onDestroy(() => {
      this.document.getElementById(STYLE_TAG_ID)?.remove();
    });
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

  async copyLink(): Promise<void> {
    const ok = await this.clipboard.copy(this.url.copyShareLink());
    this.flash(ok ? 'Link copied' : 'Copy failed');
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

  private flash(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2500);
  }
}
