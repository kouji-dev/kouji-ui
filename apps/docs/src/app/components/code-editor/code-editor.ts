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

    // Auto-size height to content for md using Monaco's content-change event
    if (isMd) {
      const updateHeight = () => {
        const contentHeight = this.editor.getContentHeight();
        this.editorHost.nativeElement.style.height = `${contentHeight}px`;
        this.editor.layout({ width: this.editorHost.nativeElement.offsetWidth, height: contentHeight });
      };
      this.editor.onDidContentSizeChange(updateHeight);
      updateHeight();
    }
  }

  private toMonacoLang(lang: string): string {
    if (lang === 'ts')  return 'typescript';
    if (lang === 'md')  return 'markdown';
    return lang;
  }

  /** Reads a CSS custom property value from :root and strips the leading # if hex. */
  private css(varName: string): string {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return raw.startsWith('#') ? raw.slice(1) : raw;
  }

  private defineThemes(monaco: any): void {
    // Reads live CSS token values — stays in sync with design system
    // Dark theme — uses our --bg: #0c0c0c, --text: #f0ede6, --accent: #b8f500
    const t = this.css.bind(this); // shorthand

    monaco.editor.defineTheme('kj-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '',               foreground: t('--text') },
        { token: 'comment',        foreground: t('--text-muted'), fontStyle: 'italic' },
        { token: 'keyword',        foreground: t('--accent') },
        { token: 'string',         foreground: '88c0a0' },
        { token: 'number',         foreground: '79b8ff' },
        { token: 'type',           foreground: 'ffab70' },
        { token: 'delimiter',      foreground: t('--text-secondary') },
        { token: 'tag',            foreground: t('--accent') },
        { token: 'attribute.name', foreground: '79b8ff' },
        { token: 'attribute.value',foreground: '88c0a0' },
        { token: 'keyword.md',         foreground: t('--text'), fontStyle: 'bold' },
        { token: 'strong.md',          foreground: t('--text'), fontStyle: 'bold' },
        { token: 'emphasis.md',        foreground: t('--text'), fontStyle: 'italic' },
        { token: 'string.md',          foreground: t('--text-secondary') },
        { token: 'comment.md',         foreground: t('--text-muted') },
        { token: 'string.link.md',     foreground: t('--accent') },
        { token: 'keyword.control.md', foreground: t('--text-muted') },
      ],
      colors: {
        'editor.background':              `#${t('--bg-surface')}`,
        'editor.foreground':              `#${t('--text')}`,
        'editor.lineHighlightBackground': `#${t('--bg-elevated')}`,
        'editorLineNumber.foreground':    `#${t('--text-muted')}`,
        'editorLineNumber.activeForeground': `#${t('--text-secondary')}`,
        'editor.selectionBackground':     `#${t('--accent')}33`,
        'editor.inactiveSelectionBackground': `#${t('--accent')}18`,
        'editorCursor.foreground':        `#${t('--accent')}`,
        'editorWidget.background':        `#${t('--bg-elevated')}`,
        'editorWidget.border':            `#${t('--border')}`,
        'editor.lineHighlightBorder':     '#00000000',
        'scrollbarSlider.background':     `#${t('--border')}`,
        'scrollbarSlider.hoverBackground':`#${t('--text-muted')}`,
        'editorGutter.background':        `#${t('--bg-surface')}`,
      },
    });

    monaco.editor.defineTheme('kj-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: '',               foreground: t('--text') },
        { token: 'comment',        foreground: t('--text-muted'), fontStyle: 'italic' },
        { token: 'keyword',        foreground: t('--accent') },
        { token: 'string',         foreground: '0550ae' },
        { token: 'number',         foreground: '953800' },
        { token: 'type',           foreground: '953800' },
        { token: 'delimiter',      foreground: t('--text-secondary') },
        { token: 'tag',            foreground: t('--accent') },
        { token: 'attribute.name', foreground: '0550ae' },
        { token: 'attribute.value',foreground: '0a3069' },
        { token: 'keyword.md',         foreground: t('--text'), fontStyle: 'bold' },
        { token: 'strong.md',          foreground: t('--text'), fontStyle: 'bold' },
        { token: 'emphasis.md',        foreground: t('--text'), fontStyle: 'italic' },
        { token: 'string.md',          foreground: t('--text-secondary') },
        { token: 'comment.md',         foreground: t('--text-muted') },
        { token: 'string.link.md',     foreground: t('--accent') },
        { token: 'keyword.control.md', foreground: t('--text-muted') },
      ],
      colors: {
        'editor.background':              `#${t('--bg-surface')}`,
        'editor.foreground':              `#${t('--text')}`,
        'editor.lineHighlightBackground': `#${t('--bg-elevated')}`,
        'editorLineNumber.foreground':    `#${t('--text-muted')}`,
        'editorLineNumber.activeForeground': `#${t('--text-secondary')}`,
        'editor.selectionBackground':     `#${t('--accent')}33`,
        'editor.inactiveSelectionBackground': `#${t('--accent')}18`,
        'editorCursor.foreground':        `#${t('--accent')}`,
        'editorWidget.background':        `#${t('--bg-surface')}`,
        'editorWidget.border':            `#${t('--border')}`,
        'editor.lineHighlightBorder':     '#00000000',
        'scrollbarSlider.background':     `#${t('--border')}`,
        'scrollbarSlider.hoverBackground':`#${t('--text-muted')}`,
        'editorGutter.background':        `#${t('--bg-surface')}`,
      },
    });
  }

  async copy(): Promise<void> {
    await this.clipboard.copy(this.code());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
