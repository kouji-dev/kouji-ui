import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ThemeImportService } from '../../services/theme-import.service';

/** Modal for importing a theme from pasted JSON or CSS, or an uploaded file. */
@Component({
  selector: 'kj-theme-import-dialog',
  standalone: true,
  templateUrl: './theme-import-dialog.html',
  styleUrl: './theme-import-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeImportDialog {
  private readonly importer = inject(ThemeImportService);
  /** Whether the dialog is visible. */
  readonly open = input<boolean>(false);
  /** Emits when the dialog should close; `imported: true` when an import was applied. */
  readonly closed = output<{ imported: boolean }>();

  protected readonly text = signal('');
  protected readonly error = signal<string | null>(null);

  protected onInput(ev: Event): void {
    this.text.set((ev.target as HTMLTextAreaElement).value);
    this.error.set(null);
  }

  protected async onFile(ev: Event): Promise<void> {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.text.set(await file.text());
    this.error.set(null);
  }

  protected apply(): void {
    const t = this.text();
    if (!t.trim()) { this.error.set('Paste or upload a theme'); return; }
    const fmt = this.importer.detectFormat(t);
    const result = fmt === 'json' ? this.importer.parseJson(t) : this.importer.parseCss(t);
    if (!result.ok) { this.error.set(result.reason); return; }
    this.importer.apply(result.draft);
    this.text.set('');
    this.closed.emit({ imported: true });
  }

  protected cancel(): void { this.closed.emit({ imported: false }); }
}
