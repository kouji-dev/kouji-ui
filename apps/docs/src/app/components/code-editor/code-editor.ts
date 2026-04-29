import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';
import { DestroyRef } from '@angular/core';

@Component({
  selector: 'kj-code-editor',
  standalone: true,
  templateUrl: './code-editor.html',
  styleUrl: './code-editor.css',
})
export class CodeEditorComponent implements OnDestroy {
  @ViewChild('editorHost', { static: false }) editorHost!: ElementRef<HTMLDivElement>;

  /** Source code to display. */
  code = input<string>('');

  /** Language for syntax highlighting. */
  lang = input<'ts' | 'html' | 'css' | 'json'>('ts');

  /** Whether the editor is read-only (default true for docs display). */
  readonly = input<boolean>(true);

  private destroyRef = inject(DestroyRef);
  private view: any; // EditorView — typed as any to avoid SSR issues

  constructor() {
    afterNextRender(async () => {
      await this.initEditor();
    });
  }

  private async initEditor(): Promise<void> {
    if (!this.editorHost?.nativeElement) return;

    const [
      { EditorView, keymap },
      { EditorState },
      { defaultKeymap },
      { oneDark },
    ] = await Promise.all([
      import('@codemirror/view'),
      import('@codemirror/state'),
      import('@codemirror/commands'),
      import('@codemirror/theme-one-dark'),
    ]);

    const langExtension = await this.getLangExtension();

    const extensions = [
      oneDark,
      langExtension,
      EditorView.lineWrapping,
      keymap.of(defaultKeymap),
      EditorView.theme({
        '&': {
          backgroundColor: '#080808',
          fontSize: '0.8rem',
          fontFamily: "'JetBrains Mono', monospace",
          borderRadius: '0',
        },
        '.cm-content': { padding: '1rem 1.25rem' },
        '.cm-gutters': { backgroundColor: '#080808', borderRight: '1px solid #1a1a1a', color: '#333' },
        '.cm-activeLineGutter': { backgroundColor: '#0f0f0f' },
        '.cm-activeLine': { backgroundColor: '#0f0f0f' },
        '.cm-focused': { outline: 'none' },
        '.cm-cursor': { borderLeftColor: '#b8f500' },
        '.cm-selectionBackground': { backgroundColor: 'rgba(184,245,0,0.12) !important' },
      }),
    ];

    if (this.readonly()) {
      extensions.push(EditorState.readOnly.of(true));
    }

    this.view = new EditorView({
      state: EditorState.create({
        doc: this.code(),
        extensions,
      }),
      parent: this.editorHost.nativeElement,
    });

    this.destroyRef.onDestroy(() => this.view?.destroy());
  }

  private async getLangExtension(): Promise<any> {
    const lang = this.lang();
    if (lang === 'html') {
      const { html } = await import('@codemirror/lang-html');
      return html();
    }
    if (lang === 'css') {
      const { css } = await import('@codemirror/lang-css');
      return css();
    }
    if (lang === 'json') {
      const { json } = await import('@codemirror/lang-json');
      return json();
    }
    // Default: TypeScript
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ typescript: true });
  }

  ngOnDestroy(): void {
    this.view?.destroy();
  }
}
