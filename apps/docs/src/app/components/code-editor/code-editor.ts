import {
  Component, DestroyRef, ElementRef, ViewChild,
  afterNextRender, effect, inject, input, signal,
} from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { ClipboardService } from '../../services/clipboard.service';

let _monacoPromise: Promise<any> | null = null;
function getMonaco(): Promise<any> {
  if (!_monacoPromise) {
    _monacoPromise = import('@monaco-editor/loader').then(m => m.default.init());
  }
  return _monacoPromise;
}

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

  private readonly themeService  = inject(ThemeService);
  private readonly clipboard     = inject(ClipboardService);
  private readonly destroyRef    = inject(DestroyRef);

  readonly copied = signal(false);

  private editor: any;
  private monaco: any;
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

    this.destroyRef.onDestroy(() => this.editor?.dispose());
  }

  private async initEditor(): Promise<void> {
    if (!this.editorHost?.nativeElement) return;
    const host = this.editorHost.nativeElement;
    if (!host.offsetParent && host.offsetHeight === 0) return;

    this.monaco = await getMonaco();
    this.defineThemes(this.monaco);

    const isDark  = this.themeService.theme() === 'dark';
    const isMd    = this.lang() === 'md';
    const monacoLang = this.toMonacoLang(this.lang());

    this.editor = this.monaco.editor.create(host, {
      value:    this.code(),
      language: monacoLang,
      theme:    isDark ? 'kj-dark' : 'kj-light',
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
      renderIndentGuides:   false,
      stickyScroll:         { enabled: false },
      cursorStyle:          'line',
      cursorBlinking:       'blink',
      automaticLayout:      true,
    });

    // Auto-size height to content for md
    if (isMd) this.fitHeightToContent();
  }

  private fitHeightToContent(): void {
    if (!this.editor) return;
    const lineCount     = this.editor.getModel()?.getLineCount() ?? 1;
    const lineHeight    = this.editor.getOption(this.monaco.editor.EditorOption.lineHeight);
    const contentHeight = lineCount * lineHeight;
    this.editorHost.nativeElement.style.height = `${contentHeight}px`;
    this.editor.layout();
  }

  private toMonacoLang(lang: string): string {
    if (lang === 'ts')  return 'typescript';
    if (lang === 'md')  return 'markdown';
    return lang;
  }

  private defineThemes(monaco: any): void {
    monaco.editor.defineTheme('kj-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '',               foreground: 'c9d1d9' },
        { token: 'comment',        foreground: '6e7681', fontStyle: 'italic' },
        { token: 'keyword',        foreground: 'ff7b72' },
        { token: 'string',         foreground: 'a5d6ff' },
        { token: 'number',         foreground: '79c0ff' },
        { token: 'type',           foreground: 'ffa657' },
        { token: 'delimiter',      foreground: '8b949e' },
        { token: 'tag',            foreground: '7ee787' },
        { token: 'attribute.name', foreground: '79c0ff' },
        { token: 'attribute.value',foreground: 'a5d6ff' },
        // Markdown — hide markers, style content
        { token: 'keyword.md',           foreground: 'c9d1d9', fontStyle: 'bold' },
        { token: 'strong.md',            foreground: 'ffffff', fontStyle: 'bold' },
        { token: 'emphasis.md',          foreground: 'c9d1d9', fontStyle: 'italic' },
        { token: 'string.md',            foreground: '8b949e' },
        { token: 'comment.md',           foreground: '6e7681' },
        { token: 'string.link.md',       foreground: '58a6ff' },
        { token: 'keyword.control.md',   foreground: '8b949e' },
      ],
      colors: {
        'editor.background':            '#0d1117',
        'editor.foreground':            '#c9d1d9',
        'editor.lineHighlightBackground': '#161b22',
        'editorLineNumber.foreground':  '#484f58',
        'editorLineNumber.activeForeground': '#c9d1d9',
        'editor.selectionBackground':   '#264f78',
        'editor.inactiveSelectionBackground': '#264f7840',
        'editorCursor.foreground':      '#c9d1d9',
        'editorWidget.background':      '#161b22',
        'editorWidget.border':          '#30363d',
        'editor.lineHighlightBorder':   '#00000000',
        'scrollbarSlider.background':   '#484f5844',
        'scrollbarSlider.hoverBackground': '#484f5866',
        'editorGutter.background':      '#0d1117',
      },
    });

    monaco.editor.defineTheme('kj-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: '',               foreground: '24292f' },
        { token: 'comment',        foreground: '6e7781', fontStyle: 'italic' },
        { token: 'keyword',        foreground: 'cf222e' },
        { token: 'string',         foreground: '0a3069' },
        { token: 'number',         foreground: '0550ae' },
        { token: 'type',           foreground: '953800' },
        { token: 'delimiter',      foreground: '57606a' },
        { token: 'tag',            foreground: '116329' },
        { token: 'attribute.name', foreground: '0550ae' },
        { token: 'attribute.value',foreground: '0a3069' },
        // Markdown
        { token: 'keyword.md',           foreground: '24292f', fontStyle: 'bold' },
        { token: 'strong.md',            foreground: '24292f', fontStyle: 'bold' },
        { token: 'emphasis.md',          foreground: '24292f', fontStyle: 'italic' },
        { token: 'string.md',            foreground: '57606a' },
        { token: 'comment.md',           foreground: '57606a' },
        { token: 'string.link.md',       foreground: '0969da' },
        { token: 'keyword.control.md',   foreground: '57606a' },
      ],
      colors: {
        'editor.background':            '#ffffff',
        'editor.foreground':            '#24292f',
        'editor.lineHighlightBackground': '#f6f8fa',
        'editorLineNumber.foreground':  '#6e7781',
        'editorLineNumber.activeForeground': '#24292f',
        'editor.selectionBackground':   '#0969da33',
        'editorCursor.foreground':      '#24292f',
        'editorWidget.background':      '#f6f8fa',
        'editorWidget.border':          '#d0d7de',
        'editor.lineHighlightBorder':   '#00000000',
        'scrollbarSlider.background':   '#8c959f33',
        'editorGutter.background':      '#ffffff',
      },
    });
  }

  async copy(): Promise<void> {
    await this.clipboard.copy(this.code());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
