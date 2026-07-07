import {
  Directive,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { KjEditorLoader } from './editor.loader';
import type {
  KjEditorInstance,
  KjEditorLineNumbers,
  KjEditorOptions,
  KjEditorWordWrap,
  KjMonaco,
} from './editor.types';

/**
 * Headless code editor — wraps [Monaco](https://microsoft.github.io/monaco-editor/)
 * (VS Code's editor) on its host element. Loads Monaco lazily after first
 * render (SSR-safe), binds `kjValue` two-way, and disposes on destroy.
 *
 * Monaco is browser-only and heavy: it is resolved through {@link KjEditorLoader}
 * whose source is configurable via `provideMonaco()` (defaults to a CDN loader
 * so nothing bloats the base bundle). The styled `<kj-editor>` wrapper in
 * `@kouji-ui/components` adds theming, a toolbar and a status bar on top.
 *
 * @example
 * ```html
 * <div kjEditor [(kjValue)]="code" kjLanguage="typescript" style="height:320px"></div>
 * ```
 * @doc-category Core/Data
 * @doc
 * @doc-name editor
 * @doc-is-main
 * @doc-description Headless Monaco-wrapped code editor directive — two-way value, language, options, SSR-safe lazy load.
 */
@Directive({
  selector: '[kjEditor]',
  standalone: true,
  exportAs: 'kjEditor',
  host: {
    '[attr.aria-label]': 'kjAriaLabel()',
  },
})
export class KjEditor {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loader = inject(KjEditorLoader);

  /** Two-way editor text. */
  readonly kjValue = model<string>('');
  /** Monaco language id (`typescript`, `html`, `css`, `json`, `markdown`, …). */
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
  /** Explicit Monaco theme id; overrides the wrapper's auto light/dark. */
  readonly kjTheme = input<string | undefined>(undefined);
  /** Accessible name — set as Monaco `ariaLabel` and the host `aria-label`. */
  readonly kjAriaLabel = input<string>('Code editor');
  /**
   * Start with Tab moving focus out instead of inserting a tab. Consumers who
   * embed the editor in a form flow may prefer this so keyboard users are never
   * trapped; the `Ctrl+M` toggle remains available either way.
   */
  readonly kjTabFocusMode = input<boolean>(false);
  /** Escape hatch — merged last into Monaco's construction options. */
  readonly kjOptions = input<KjEditorOptions>({});

  /** Emits the live Monaco editor once created, for imperative use. */
  readonly kjReady = output<KjEditorInstance>();

  private editor: KjEditorInstance | null = null;
  private monaco: KjMonaco | null = null;
  private applyingExternal = false;
  /** Our tracked copy of Monaco's tabFocusMode (no public getter exists). */
  private tabFocusOn = false;
  private readonly reducedMotion = signal(false);

  constructor() {
    afterNextRender(() => {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.reducedMotion.set(mql.matches);
        const onChange = (e: MediaQueryListEvent) => this.reducedMotion.set(e.matches);
        mql.addEventListener('change', onChange);
        this.destroyRef.onDestroy(() => mql.removeEventListener('change', onChange));
      }
      void this.init();
    });

    // Push external value changes into the model (guard against typing echo).
    effect(() => {
      const next = this.kjValue();
      if (this.editor && !this.applyingExternal) {
        const model = this.editor.getModel();
        if (model && model.getValue() !== next) {
          model.setValue(next);
        }
      }
    });

    // Language switch.
    effect(() => {
      const lang = this.kjLanguage();
      if (this.editor && this.monaco) {
        const model = this.editor.getModel();
        if (model && model.getLanguageId() !== lang) {
          this.monaco.editor.setModelLanguage(model, lang);
        }
      }
    });

    // Live option updates (readonly / minimap / line-numbers / wrap / font / motion / overrides).
    effect(() => {
      const opts = this.resolveOptions();
      if (this.editor) this.editor.updateOptions(opts);
    });

    // Tab-focus mode (keyboard-trap escape) — keep Monaco in sync with the input.
    effect(() => {
      const tabMoves = this.kjTabFocusMode();
      if (this.editor) this.syncTabFocus(tabMoves);
    });

    this.destroyRef.onDestroy(() => this.dispose());
  }

  /** Focus the editor. */
  focus(): void {
    this.editor?.focus();
  }

  /** Relayout the editor to its host size. */
  layout(): void {
    this.editor?.layout();
  }

  /** The live Monaco editor instance, or `null` before mount / after destroy. */
  getEditor(): KjEditorInstance | null {
    return this.editor;
  }

  private async init(): Promise<void> {
    const host = this.el.nativeElement;
    if (!host) return;
    try {
      this.monaco = await this.loader.load();
    } catch {
      // Monaco cannot load in non-browser / offline environments — leave the
      // host empty; the styled wrapper keeps showing its loading region.
      return;
    }
    if (!this.monaco) return;

    this.editor = this.monaco.editor.create(host, {
      value: this.kjValue(),
      language: this.kjLanguage(),
      ...this.resolveOptions(),
    });

    // Typing → model (mark as external-safe so the value effect doesn't echo).
    const instance = this.editor;
    instance.onDidChangeModelContent(() => {
      this.applyingExternal = true;
      this.kjValue.set(instance.getValue());
      this.applyingExternal = false;
    });

    this.syncTabFocus(this.kjTabFocusMode());
    this.kjReady.emit(instance);
  }

  private resolveOptions(): KjEditorOptions {
    const reduced = this.reducedMotion();
    const base: KjEditorOptions = {
      readOnly: this.kjReadonly(),
      minimap: { enabled: this.kjMinimap() },
      lineNumbers: this.kjLineNumbers(),
      wordWrap: this.kjWordWrap(),
      fontSize: this.kjFontSize(),
      ariaLabel: this.kjAriaLabel(),
      // AAA: let Monaco detect a screen reader and switch to accessible rendering.
      accessibilitySupport: 'auto',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      // Reduced-motion (2.3.3): kill caret/scroll animation.
      cursorBlinking: reduced ? 'solid' : 'blink',
      cursorSmoothCaretAnimation: reduced ? 'off' : 'on',
      smoothScrolling: !reduced,
    };
    const theme = this.kjTheme();
    if (theme) base.theme = theme;
    return { ...base, ...this.kjOptions() };
  }

  /**
   * Force Monaco's tabFocusMode to a specific state (idempotent). `tabFocusMode`
   * is not a construction option — it's a context key flipped by the
   * `toggleTabFocusMode` command (bound to `Ctrl+M`). We track our own copy
   * since Monaco exposes no public getter, and only trigger the toggle when the
   * desired state differs from what we last applied.
   */
  private syncTabFocus(tabMoves: boolean): void {
    if (!this.editor || this.tabFocusOn === tabMoves) return;
    this.editor.trigger('kjEditor', 'editor.action.toggleTabFocusMode', undefined);
    this.tabFocusOn = tabMoves;
  }

  private dispose(): void {
    this.editor?.getModel()?.dispose();
    this.editor?.dispose();
    this.editor = null;
  }
}
