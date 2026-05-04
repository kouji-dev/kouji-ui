import {
  Component, DestroyRef, ElementRef, ViewChild,
  afterNextRender, effect, inject, input, signal,
} from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { ClipboardService } from '../../services/clipboard.service';
import { MonacoService } from '../../services/monaco.service';

@Component({
  selector: 'kj-code-editor',
  standalone: true,
  templateUrl: './code-editor.html',
  styleUrl: './code-editor.css',
})
export class CodeEditorComponent {
  @ViewChild('editorHost', { static: false }) editorHost!: ElementRef<HTMLDivElement>;

  code       = input<string>('');
  lang       = input<'ts' | 'html' | 'css' | 'json' | 'md'>('ts');
  readonly   = input<boolean>(true);
  showHeader = input<boolean>(true);

  private readonly themeService = inject(ThemeService);
  private readonly clipboard    = inject(ClipboardService);
  private readonly monacoSvc    = inject(MonacoService);
  private readonly destroyRef   = inject(DestroyRef);

  readonly copied = signal(false);

  private editor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;
  private monaco: typeof import('monaco-editor') | null = null;
  private initialized = false;

  constructor() {
    afterNextRender(async () => {
      await this.initEditor();
      this.initialized = true;
    });

    // Rebuild on theme change
    effect(async () => {
      this.themeService.theme();
      if (this.initialized) {
        this.editor?.dispose();
        this.editor = null;
        await this.initEditor();
      }
    });

    // Update content on code change
    effect(() => {
      const newCode = this.code();
      if (this.initialized && this.editor) {
        const model = this.editor.getModel();
        if (model && model.getValue() !== newCode) {
          model.setValue(newCode);
        }
      }
    });

    // Update model language when `lang` input changes (e.g. switching tabs in code-preview).
    // Without this the tokenizer stays in the original language and everything falls to default.
    effect(() => {
      const newLang = this.lang();
      if (this.initialized && this.editor && this.monaco) {
        const model = this.editor.getModel();
        const target = this.toMonacoLang(newLang);
        if (model && model.getLanguageId() !== target) {
          this.monaco.editor.setModelLanguage(model, target);
        }
      }
    });

    this.destroyRef.onDestroy(() => this.editor?.dispose());
  }

  private async initEditor(): Promise<void> {
    if (!this.editorHost?.nativeElement) return;
    const host = this.editorHost.nativeElement;
    if (!host.offsetParent && host.offsetHeight === 0) return;

    this.monaco = await this.monacoSvc.getMonaco();

    const isDark  = this.themeService.theme() === 'dark';
    const isMd    = this.lang() === 'md';
    const monacoLang = this.toMonacoLang(this.lang());

    this.editor = this.monaco.editor.create(host, {
      value:    this.code(),
      language: monacoLang,
      theme:    isDark ? 'vs-dark' : 'vs',
      readOnly: this.readonly(),

      // Layout
      minimap:            { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap:           isMd ? 'on' : 'off',
      lineNumbers:        isMd ? 'off' : 'on',
      lineDecorationsWidth: isMd ? 0 : 16,
      glyphMargin:        false,
      folding:            false,
      renderLineHighlight: 'none',
      overviewRulerBorder: false,
      overviewRulerLanes:  0,

      // Typography
      fontSize:    isMd ? 14 : 13,
      fontFamily:  isMd ? "system-ui, -apple-system, sans-serif" : "'JetBrains Mono', monospace",
      lineHeight:  isMd ? 24 : 20,

      // Scrollbar
      scrollbar: {
        vertical:   'auto',
        horizontal: 'auto',
        verticalScrollbarSize:   6,
        horizontalScrollbarSize: 6,
      },

      // Padding
      padding: { top: isMd ? 0 : 16, bottom: isMd ? 0 : 16 },

      // Remove decorations
      contextmenu:          false,
      links:                false,
      occurrencesHighlight: 'off',
      selectionHighlight:   false,
      stickyScroll:         { enabled: false },
      cursorStyle:          'line',
      cursorBlinking:       'blink',
      automaticLayout:      true,
    });

    // Auto-size to content. md is uncapped; code mode caps at ~30 lines and scrolls past.
    const editor = this.editor;
    const maxHeight = isMd ? Number.POSITIVE_INFINITY : 620;
    const updateHeight = () => {
      const contentHeight = Math.min(maxHeight, editor.getContentHeight());
      this.editorHost.nativeElement.style.height = `${contentHeight}px`;
      editor.layout({ width: this.editorHost.nativeElement.offsetWidth, height: contentHeight });
    };
    editor.onDidContentSizeChange(updateHeight);
    updateHeight();
  }

  private toMonacoLang(lang: string): string {
    if (lang === 'ts')  return 'typescript';
    if (lang === 'md')  return 'markdown';
    return lang;
  }

  async copy(): Promise<void> {
    await this.clipboard.copy(this.code());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
