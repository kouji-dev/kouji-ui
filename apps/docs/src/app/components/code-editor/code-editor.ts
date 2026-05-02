import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DestroyRef } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { ClipboardService } from '../../services/clipboard.service';

@Component({
  selector: 'kj-code-editor',
  standalone: true,
  templateUrl: './code-editor.html',
  styleUrl: './code-editor.css',
})
export class CodeEditorComponent implements OnDestroy {
  @ViewChild('editorHost', { static: false }) editorHost!: ElementRef<HTMLDivElement>;

  code = input<string>('');
  lang = input<'ts' | 'html' | 'css' | 'json' | 'md'>('ts');
  readonly = input<boolean>(true);
  showHeader = input<boolean>(true);

  private readonly destroyRef = inject(DestroyRef);
  private readonly themeService = inject(ThemeService);
  private readonly clipboard = inject(ClipboardService);
  private view: any;
  private initialized = false;

  readonly copied = signal(false);

  async copy(): Promise<void> {
    await this.clipboard.copy(this.code());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }

  constructor() {
    afterNextRender(async () => {
      await this.initEditor();
      this.initialized = true;
    });

    // Re-initialize when docs theme (light/dark) changes
    effect(async () => {
      this.themeService.theme();
      if (this.initialized) {
        this.view?.destroy();
        this.view = null;
        await this.initEditor();
      }
    });

    // Update editor content when the `code` input changes (e.g. switching preview theme)
    effect(() => {
      const newCode = this.code();
      if (this.initialized && this.view) {
        const currentLen = this.view.state.doc.length;
        this.view.dispatch({
          changes: { from: 0, to: currentLen, insert: newCode },
        });
      }
    });
  }

  private async initEditor(): Promise<void> {
    if (!this.editorHost?.nativeElement) return;

    const [
      { EditorView, keymap },
      { EditorState },
      { defaultKeymap },
    ] = await Promise.all([
      import('@codemirror/view'),
      import('@codemirror/state'),
      import('@codemirror/commands'),
    ]);

    const isDark = this.themeService.theme() === 'dark';
    const colorTheme = isDark
      ? (await import('@codemirror/theme-one-dark')).oneDark
      : EditorView.theme({
          '&': { backgroundColor: 'var(--bg-surface)', color: '#24292e' },
          '.cm-content': { caretColor: 'var(--accent)' },
          '.cm-cursor': { borderLeftColor: 'var(--accent)' },
          '.cm-gutters': { backgroundColor: 'var(--bg-subtle)', borderRight: '1px solid var(--border)', color: 'var(--text-muted)' },
          '.cm-activeLineGutter': { backgroundColor: 'var(--bg-hover)' },
          '.cm-activeLine': { backgroundColor: 'var(--bg-hover)' },
          '.cm-selectionBackground': { backgroundColor: 'var(--accent-dim) !important' },
          '.cm-focused': { outline: 'none' },
          // Light syntax colors (GitHub-inspired)
          '.cm-keyword': { color: '#d73a49' },
          '.cm-string': { color: '#032f62' },
          '.cm-comment': { color: '#6a737d', fontStyle: 'italic' },
          '.cm-variableName': { color: '#24292e' },
          '.cm-typeName': { color: '#6f42c1' },
          '.cm-tagName': { color: '#22863a' },
          '.cm-attributeName': { color: '#6f42c1' },
          '.cm-number': { color: '#005cc5' },
          '.cm-operator': { color: '#d73a49' },
          '.cm-punctuation': { color: '#24292e' },
        });

    const baseTheme = EditorView.theme({
      '&': {
        fontSize: '0.8rem',
        fontFamily: "'JetBrains Mono', monospace",
        borderRadius: '0',
        ...(isDark ? { backgroundColor: '#080808' } : {}),
      },
      '.cm-content': { padding: '1rem 1.25rem' },
      '.cm-focused': { outline: 'none' },
    });

    const langExtension = await this.getLangExtension();
    const extensions = [colorTheme, baseTheme, langExtension, EditorView.lineWrapping, keymap.of(defaultKeymap)];

    if (this.readonly()) {
      extensions.push(EditorState.readOnly.of(true));
    }

    this.view = new EditorView({
      state: EditorState.create({ doc: this.code(), extensions }),
      parent: this.editorHost.nativeElement,
    });

    this.destroyRef.onDestroy(() => this.view?.destroy());
  }

  private async getLangExtension(): Promise<any> {
    const lang = this.lang();
    if (lang === 'html') { const { html } = await import('@codemirror/lang-html'); return html(); }
    if (lang === 'css') { const { css } = await import('@codemirror/lang-css'); return css(); }
    if (lang === 'json') { const { json } = await import('@codemirror/lang-json'); return json(); }
    if (lang === 'md') {
      const [{ markdown }, { HighlightStyle, syntaxHighlighting }, { tags: t }] = await Promise.all([
        import('@codemirror/lang-markdown'),
        import('@codemirror/language'),
        import('@lezer/highlight'),
      ]);
      const mdStyle = HighlightStyle.define([
        { tag: t.heading1,       fontSize: '1.6em', fontWeight: 'bold',   color: 'var(--text)' },
        { tag: t.heading2,       fontSize: '1.35em', fontWeight: 'bold',  color: 'var(--text)' },
        { tag: t.heading3,       fontSize: '1.15em', fontWeight: 'bold',  color: 'var(--text)' },
        { tag: t.strong,         fontWeight: 'bold',  color: 'var(--text)' },
        { tag: t.emphasis,       fontStyle: 'italic', color: 'var(--text-secondary)' },
        { tag: t.monospace,      fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85em', color: 'var(--accent)', background: 'var(--bg-subtle)', padding: '0.1em 0.25em' },
        { tag: t.link,           color: 'var(--accent)', textDecoration: 'underline' },
        { tag: t.url,            color: 'var(--accent)' },
        { tag: t.strikethrough,  textDecoration: 'line-through', color: 'var(--text-muted)' },
        { tag: t.processingInstruction, color: 'var(--text-muted)', fontSize: '0.85em' },
        { tag: t.contentSeparator, color: 'var(--border)' },
      ]);
      const { EditorView: EV } = await import('@codemirror/view');
      const hideMarkers = EV.theme({
        // Hide markdown syntax markers — ** * _ __ ` # - for clean read-only display
        '.cm-formatting': { opacity: '0', fontSize: '0', letterSpacing: '-0.5em', userSelect: 'none' },
        '.cm-formatting-strong':      { display: 'none' },
        '.cm-formatting-em':          { display: 'none' },
        '.cm-formatting-code':        { display: 'none' },
        '.cm-formatting-code-block':  { display: 'none' },
        '.cm-formatting-heading':     { display: 'none' },
        '.cm-formatting-list':        { display: 'none' },
        '.cm-formatting-link':        { display: 'none' },
        '.cm-formatting-link-string': { display: 'none' },
      });
      return [markdown(), syntaxHighlighting(mdStyle), hideMarkers];
    }
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ typescript: true });
  }

  ngOnDestroy(): void { this.view?.destroy(); }
}
