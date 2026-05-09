import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  KjDropdownMenuContent,
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
  KjDropdownMenuTrigger,
} from '@kouji-ui/core';
import { KjButtonComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { ClipboardService } from '../../services/clipboard.service';
import { ThemeUrlService } from '../../services/theme-url.service';
import { CURATED_FONTS } from '../../lib/theme/font-catalog';
import { serializeToScopedBlock } from '../../lib/theme/serialize-theme';
import { BUILT_IN_NAMES } from '../../lib/theme/built-in-themes';

@Component({
  selector: 'kj-theme-toolbar',
  standalone: true,
  imports: [
    KjButtonComponent,
    KjDropdownMenuTrigger,
    KjDropdownMenuContent,
    KjDropdownMenuItem,
    KjDropdownMenuSeparator,
  ],
  templateUrl: './theme-toolbar.html',
  styleUrl: './theme-toolbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToolbar {
  private readonly draftService = inject(ThemeDraftService);
  private readonly clipboard = inject(ClipboardService);
  private readonly url = inject(ThemeUrlService);
  private readonly document = inject(DOCUMENT);

  /** Fired when the user activates the Import button. */
  @Output() readonly requestImport = new EventEmitter<void>();

  protected readonly draft = this.draftService.draft;
  protected readonly toast = signal<string | null>(null);

  protected readonly nameError = computed<string | null>(() => {
    const n = this.draft().name;
    if (!n) return null;
    if ((BUILT_IN_NAMES as readonly string[]).includes(n)) return 'Reserved built-in name';
    if (n.length > 32) return 'Max 32 characters';
    if (!/^[a-z0-9-]+$/.test(n)) return 'Use lowercase letters, digits, and hyphens';
    return null;
  });
  protected readonly saveDisabled = computed(() => !this.draft().name || this.nameError() !== null);

  protected onNameChange(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 32);
    this.draftService.setName(v);
  }

  protected save(): void {
    const r = this.draftService.save();
    this.flash(
      r.ok
        ? `Saved "${this.draft().name}"`
        : r.reason === 'reserved'
          ? 'That name is reserved by a built-in theme'
          : 'Pick a name first',
    );
  }

  protected reset(): void {
    this.draftService.resetToOriginal();
    this.flash('Reset');
  }

  protected shuffleColors(): void {
    this.draftService.applyRandomInspiration();
  }

  protected shuffleTheme(): void {
    this.draftService.applyRandomInspiration({ includeShape: true });
  }

  protected rederive(): void {
    this.draftService.rederiveFromPrimary();
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

  private exportedCss(): string {
    const name = this.draft().name || 'custom';
    const importLines = this.fontImports();
    return [importLines, serializeToScopedBlock(name, this.draftService.resolvedTokens())].filter(Boolean).join('\n\n');
  }

  private fontImports(): string {
    const used = new Set<string>();
    for (const k of ['fontSans', 'fontMono', 'fontDisplay'] as const) {
      const family = this.draft().type[k];
      const f = CURATED_FONTS.find(c => family.includes(c.family));
      if (f?.query) used.add(`@import url('https://fonts.googleapis.com/css2?${f.query}&display=swap');`);
    }
    return [...used].join('\n');
  }

  private download(filename: string, content: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = this.document.createElement('a');
    a.href = url;
    a.download = filename;
    this.document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private flash(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2500);
  }
}
