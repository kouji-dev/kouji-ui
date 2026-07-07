import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import {
  KjEditor,
  KjEditorLoader,
  type KjEditorInstance,
  type KjEditorLineNumbers,
  type KjEditorOptions,
  type KjEditorWordWrap,
  type KjMonaco,
} from '@kouji-ui/core';
import { KjSpinnerComponent } from '../spinner/spinner';

/**
 * Styled code editor — a themed `<kj-editor>` wrapping the headless `KjEditor`
 * directive (which wraps Monaco). Adds a kj-token-synced Monaco theme that
 * re-applies on theme switch, an optional toolbar (language badge + copy) and
 * status bar (cursor position + a keyboard-escape hint), reduced-motion, and a
 * loading region.
 *
 * Monaco is browser-only and heavy; it loads lazily after first render via
 * `KjEditorLoader`. Configure the source app-wide with `provideMonaco()`
 * (defaults to a CDN loader so the base bundle stays lean).
 *
 * @example
 * ```html
 * <kj-editor [(kjValue)]="code" kjLanguage="typescript" style="height:340px" />
 * ```
 * @doc-category Components/Data
 * @doc
 * @doc-name editor
 * @doc-is-main
 * @doc-description Themed Monaco code editor — syntax highlighting, two-way value, kj-theme sync, and AAA keyboard access.
 * @doc-example Default
 *   A TypeScript editor with the toolbar and status bar, two-way bound to a signal.
 *   @doc-file editor.example.ts
 * @doc-example Languages
 *   Switch the `kjLanguage` to re-tokenise the same buffer across TS / HTML / CSS / JSON.
 *   @doc-file editor.languages.example.ts
 * @doc-example Read-only
 *   A read-only viewer with the minimap enabled and line numbers on.
 *   @doc-file editor.readonly.example.ts
 * @doc-example Options
 *   Toggle readonly, minimap, word wrap, line numbers and font size live.
 *   @doc-file editor.options.example.ts
 *
 * @doc-keyboard
 *   Tab                     Inserts a tab / indents (Monaco default)
 *   Ctrl+M                  Toggles Tab-trapping — flips Tab to move focus in/out (no keyboard trap)
 *   Alt+F1                  Opens Monaco's accessibility help
 *   Standard editing keys   Arrow / Home / End / PageUp-Down / selection / undo-redo
 *
 * @doc-aria
 *   aria-label   Monaco's textarea is labelled from kjAriaLabel (defaults to "Code editor")
 *   role=status  The loading region announces the editor is loading
 */
@Component({
  selector: 'kj-editor',
  standalone: true,
  imports: [KjEditor, KjSpinnerComponent],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjEditorComponent {
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loader = inject(KjEditorLoader);

  readonly editorHost = viewChild.required<ElementRef<HTMLDivElement>>('editorHost');

  /** Two-way editor text. */
  readonly kjValue = model<string>('');
  /** Monaco language id. */
  readonly kjLanguage = input<string>('plaintext');
  /** Read-only mode. */
  readonly kjReadonly = input<boolean>(false);
  /** Show the minimap. */
  readonly kjMinimap = input<boolean>(false);
  /** Gutter line-number mode. */
  readonly kjLineNumbers = input<KjEditorLineNumbers>('on');
  /** Soft wrap. */
  readonly kjWordWrap = input<KjEditorWordWrap>('off');
  /** Font size in px. */
  readonly kjFontSize = input<number>(13);
  /** Accessible name for the editor. */
  readonly kjAriaLabel = input<string>('Code editor');
  /** Start with Tab moving focus out instead of indenting. */
  readonly kjTabFocusMode = input<boolean>(false);
  /** Escape hatch — merged last into Monaco's construction options. */
  readonly kjOptions = input<KjEditorOptions>({});
  /** Show the toolbar (language badge + copy button). */
  readonly kjShowToolbar = input<boolean>(true);
  /** Show the status bar (cursor position + keyboard hint). */
  readonly kjShowStatusBar = input<boolean>(true);

  /** True until Monaco has mounted. */
  readonly loading = signal(true);
  /** Cursor position for the status bar. */
  readonly line = signal(1);
  readonly column = signal(1);
  readonly copied = signal(false);

  /** Current kj-derived Monaco theme id, bound onto the directive. */
  readonly themeId = signal('vs');
  /** Human label for the platform-appropriate tab-escape shortcut. */
  readonly escapeHint = computed(() => 'Press Ctrl+M to toggle Tab trapping');

  private monaco: KjMonaco | null = null;

  constructor() {
    afterNextRender(() => {
      void this.syncTheme();
      // Re-apply the kj Monaco theme when the app theme switches.
      if (typeof MutationObserver !== 'undefined') {
        const obs = new MutationObserver(() => void this.syncTheme());
        obs.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme', 'class'],
        });
        this.destroyRef.onDestroy(() => obs.disconnect());
      }
    });
  }

  /** Wired from the directive's `kjReady` output. */
  onReady(editor: KjEditorInstance): void {
    this.loading.set(false);
    editor.onDidChangeCursorPosition((e) => {
      this.line.set(e.position.lineNumber);
      this.column.set(e.position.column);
    });
    void this.syncTheme();
  }

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.kjValue());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      // Clipboard unavailable (insecure context / denied) — no-op.
    }
  }

  /**
   * Read the resolved `--kj-*` surface tokens off the host, derive the scheme
   * from background luminance (theme-agnostic — works for any kj theme), define
   * a Monaco theme tinted with those tokens, and apply it globally.
   */
  private async syncTheme(): Promise<void> {
    if (!this.monaco) {
      try {
        this.monaco = await this.loader.load();
      } catch {
        return;
      }
    }
    const monaco = this.monaco;
    if (!monaco || typeof getComputedStyle === 'undefined') return;

    const bg = this.resolveColor('--kj-bg-surface') ?? [255, 255, 255];
    const fg = this.resolveColor('--kj-fg-default') ?? [30, 30, 30];
    const muted = this.resolveColor('--kj-fg-muted') ?? [130, 130, 130];
    const accent = this.resolveColor('--kj-bg-primary') ?? [90, 120, 255];

    const dark = luminance(bg) < 0.5;
    const id = dark ? 'kj-editor-dark' : 'kj-editor-light';

    monaco.editor.defineTheme(id, {
      base: dark ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': hex(bg),
        'editor.foreground': hex(fg),
        'editorLineNumber.foreground': hex(muted),
        'editorLineNumber.activeForeground': hex(fg),
        'editorCursor.foreground': hex(accent),
        'editor.selectionBackground': hex(accent) + '55',
        'editorGutter.background': hex(bg),
      },
    });
    monaco.editor.setTheme(id);
    this.themeId.set(id);
  }

  /** Resolve a CSS custom property to [r,g,b] via a probe element. */
  private resolveColor(varName: string): [number, number, number] | null {
    const host = this.hostRef.nativeElement;
    const probe = document.createElement('span');
    probe.style.color = `var(${varName})`;
    probe.style.display = 'none';
    host.appendChild(probe);
    const rgb = getComputedStyle(probe).color;
    host.removeChild(probe);
    const m = rgb.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return [parts[0], parts[1], parts[2]];
  }
}

/** Relative luminance (0 dark – 1 light) of an [r,g,b] triple. */
function luminance([r, g, b]: [number, number, number]): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** [r,g,b] → `#rrggbb`. */
function hex([r, g, b]: [number, number, number]): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
