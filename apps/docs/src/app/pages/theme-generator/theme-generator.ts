import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { KJ_TAG_DEFAULTS, KjVisuallyHidden, provideKjTag } from '@kouji-ui/core';
import { ThemeGeneratorPreviewComponent } from './preview/theme-generator-preview';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { ThemeUrlService } from '../../services/theme-url.service';
import { ThemeImportDialog } from '../../components/theme-import-dialog/theme-import-dialog';
import { ThemeToolbar } from '../../components/theme-toolbar/theme-toolbar';
import { ThemeConfigPanel } from '../../components/theme-config-panel/theme-config-panel';

const STYLE_TAG_ID = 'kj-draft-style';

@Component({
  selector: 'kj-theme-generator',
  standalone: true,
  imports: [ThemeToolbar, ThemeConfigPanel, ThemeGeneratorPreviewComponent, ThemeImportDialog, KjVisuallyHidden],
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

  protected readonly toast = signal<string | null>(null);
  protected readonly importOpen = signal(false);

  protected openImport(): void { this.importOpen.set(true); }

  protected onImportClosed(ev: { imported: boolean }): void {
    this.importOpen.set(false);
    if (ev.imported) this.flash('Imported');
  }

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

  private flash(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(null), 2500);
  }
}
