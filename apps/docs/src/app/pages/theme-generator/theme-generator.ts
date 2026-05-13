import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { KJ_TAG_DEFAULTS, KjVisuallyHidden, provideKjTag } from '@kouji-ui/core';
import { KjButtonComponent } from '@kouji-ui/components';
import { ThemeGeneratorPreviewComponent } from './preview/theme-generator-preview';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { ThemeUrlService } from '../../services/theme-url.service';
import { ClipboardService } from '../../services/clipboard.service';
import { ThemeImportDialog } from '../../components/theme-import-dialog/theme-import-dialog';
import { serializeToScopedBlock } from '../../lib/theme/serialize-theme';
import { CURATED_FONTS } from '../../lib/theme/font-catalog';
import { BUILT_IN_NAMES } from '../../lib/theme/built-in-themes';
import { ControlsPanel } from './controls/controls-panel';
import { A11yBar, type CbSim } from './a11y-bar/a11y-bar';

const STYLE_TAG_ID = 'kj-draft-style';

/**
 * Theme generator page — fork, tweak, ship.
 *
 * Layout matches the design spec:
 *   • Subheader: eyebrow + h1 + theme-name input + share / export / save actions
 *   • Two-column body:
 *       LEFT (sticky 320px)  — `<kj-theme-controls-panel>` (Colors/Type/Shape/Spacing/Motion)
 *       RIGHT (flex)         — `<kj-theme-a11y-bar>` + `<kj-theme-generator-preview>` stage
 *
 * The preview wrapper carries `data-theme="custom-draft"` so the injected
 * `<style id="kj-draft-style">` block (managed via {@link ThemeDraftService.css})
 * applies its scoped variables. The stage also reads three preview-only
 * flags from `<kj-theme-a11y-bar>` toggles:
 *   • `data-cb-sim`          — applies a CSS `filter: url(#cb-…)`
 *   • `data-reduced-motion`  — zeros transition/animation durations
 *   • `data-focus-test`      — exposes focus rings on every interactive
 */
@Component({
  selector: 'kj-theme-generator',
  standalone: true,
  imports: [
    KjButtonComponent,
    KjVisuallyHidden,
    ControlsPanel,
    A11yBar,
    ThemeGeneratorPreviewComponent,
    ThemeImportDialog,
  ],
  templateUrl: './theme-generator.html',
  styleUrl: './theme-generator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideKjTag({
      defaults: { ...KJ_TAG_DEFAULTS.defaults, size: 'xs' },
    }),
  ],
})
export class ThemeGeneratorComponent {
  private readonly draftService = inject(ThemeDraftService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly url = inject(ThemeUrlService);
  private readonly clipboard = inject(ClipboardService);

  protected readonly draft = this.draftService.draft;
  protected readonly toast = signal<string | null>(null);
  protected readonly importOpen = signal(false);
  protected readonly cbSim = signal<CbSim>('none');
  protected readonly reducedMotion = signal(false);
  protected readonly focusTest = signal(false);

  protected readonly nameError = computed<string | null>(() => {
    const n = this.draft().name;
    if (!n) return null;
    if ((BUILT_IN_NAMES as readonly string[]).includes(n)) return 'Reserved built-in name';
    if (n.length > 32) return 'Max 32 characters';
    if (!/^[a-z0-9-]+$/.test(n)) return 'Use lowercase letters, digits, and hyphens';
    return null;
  });
  protected readonly saveDisabled = computed(
    () => !this.draft().name || this.nameError() !== null,
  );

  protected openImport(): void { this.importOpen.set(true); }

  protected onImportClosed(ev: { imported: boolean }): void {
    this.importOpen.set(false);
    if (ev.imported) this.flash('Imported');
  }

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

  /** Copy the generated CSS to clipboard. */
  protected async exportCss(): Promise<void> {
    const ok = await this.clipboard.copy(this.buildCss());
    this.flash(ok ? 'CSS copied to clipboard' : 'Copy failed');
  }

  /** Copy the share link (URL with the draft encoded in the hash). */
  protected async share(): Promise<void> {
    const ok = await this.clipboard.copy(this.url.copyShareLink());
    this.flash(ok ? 'Share link copied' : 'Copy failed');
  }

  private buildCss(): string {
    const name = this.draft().name || 'custom';
    const imports = this.fontImports();
    const block = serializeToScopedBlock(name, this.draftService.resolvedTokens());
    return [imports, block].filter(Boolean).join('\n\n');
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

  /**
   * Inject/update the scoped draft style block — created in injection context.
   * Browser-only; jsdom tests pick it up via `typeof document` guard.
   */
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

  private flash(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2500);
  }
}
