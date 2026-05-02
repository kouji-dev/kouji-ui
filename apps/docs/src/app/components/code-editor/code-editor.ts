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
    // Dark theme — uses our --bg: #0c0c0c, --text: #f0ede6, --accent: #b8f500
    monaco.editor.defineTheme('kj-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '',                foreground: 'f0ede6' },          // --text
        { token: 'comment',         foreground: '333333', fontStyle: 'italic' }, // --text-muted
        { token: 'keyword',         foreground: 'b8f500' },          // --accent
        { token: 'string',          foreground: '88c0a0' },          // soft green
        { token: 'number',          foreground: '79b8ff' },          // soft blue
        { token: 'type',            foreground: 'ffab70' },          // soft orange
        { token: 'delimiter',       foreground: '666666' },          // --text-secondary
        { token: 'tag',             foreground: 'b8f500' },          // --accent for HTML tags
        { token: 'attribute.name',  foreground: '79b8ff' },
        { token: 'attribute.value', foreground: '88c0a0' },
        // Markdown tokens
        { token: 'keyword.md',          foreground: 'f0ede6', fontStyle: 'bold' },
        { token: 'strong.md',           foreground: 'f0ede6', fontStyle: 'bold' },
        { token: 'emphasis.md',         foreground: 'f0ede6', fontStyle: 'italic' },
        { token: 'string.md',           foreground: '666666' },
        { token: 'comment.md',          foreground: '333333' },
        { token: 'string.link.md',      foreground: 'b8f500' },
        { token: 'keyword.control.md',  foreground: '333333' },
      ],
      colors: {
        'editor.background':               '#080808', // --bg-surface
        'editor.foreground':               '#f0ede6', // --text
        'editor.lineHighlightBackground':  '#0e0e0e', // --bg-elevated
        'editorLineNumber.foreground':     '#333333', // --text-muted
        'editorLineNumber.activeForeground': '#666666',
        'editor.selectionBackground':      'rgba(184,245,0,0.15)', // accent-dim
        'editor.inactiveSelectionBackground': 'rgba(184,245,0,0.08)',
        'editorCursor.foreground':         '#b8f500', // --accent
        'editorWidget.background':         '#0e0e0e',
        'editorWidget.border':             '#1a1a1a', // --border
        'editor.lineHighlightBorder':      '#00000000',
        'scrollbarSlider.background':      '#1a1a1a',
        'scrollbarSlider.hoverBackground': '#333333',
        'editorGutter.background':         '#080808',
      },
    });

    // Light theme — uses our --bg: #f7f7f5, --text: #111111, --accent: #4d7500
    monaco.editor.defineTheme('kj-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: '',                foreground: '111111' },          // --text
        { token: 'comment',         foreground: '999999', fontStyle: 'italic' }, // --text-muted
        { token: 'keyword',         foreground: '4d7500' },          // --accent (dark)
        { token: 'string',          foreground: '0550ae' },          // blue
        { token: 'number',          foreground: '953800' },          // brown
        { token: 'type',            foreground: '953800' },
        { token: 'delimiter',       foreground: '555555' },          // --text-secondary
        { token: 'tag',             foreground: '4d7500' },
        { token: 'attribute.name',  foreground: '0550ae' },
        { token: 'attribute.value', foreground: '0a3069' },
        // Markdown tokens
        { token: 'keyword.md',          foreground: '111111', fontStyle: 'bold' },
        { token: 'strong.md',           foreground: '111111', fontStyle: 'bold' },
        { token: 'emphasis.md',         foreground: '111111', fontStyle: 'italic' },
        { token: 'string.md',           foreground: '555555' },
        { token: 'comment.md',          foreground: '999999' },
        { token: 'string.link.md',      foreground: '4d7500' },
        { token: 'keyword.control.md',  foreground: '999999' },
      ],
      colors: {
        'editor.background':               '#f0f0ee', // --bg-surface
        'editor.foreground':               '#111111', // --text
        'editor.lineHighlightBackground':  '#ffffff', // --bg-elevated
        'editorLineNumber.foreground':     '#999999', // --text-muted
        'editorLineNumber.activeForeground': '#555555',
        'editor.selectionBackground':      'rgba(77,117,0,0.15)',
        'editor.inactiveSelectionBackground': 'rgba(77,117,0,0.08)',
        'editorCursor.foreground':         '#4d7500', // --accent
        'editorWidget.background':         '#f0f0ee',
        'editorWidget.border':             '#dededc', // --border
        'editor.lineHighlightBorder':      '#00000000',
        'scrollbarSlider.background':      '#dededc',
        'scrollbarSlider.hoverBackground': '#999999',
        'editorGutter.background':         '#f0f0ee',
      },
    });
  }

  async copy(): Promise<void> {
    await this.clipboard.copy(this.code());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
