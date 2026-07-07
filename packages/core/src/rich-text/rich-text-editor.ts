import {
  Directive,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { LexicalEditor, SerializedEditorState } from 'lexical';
import type { RichTextEngine } from './engine';
import type { KjRichTextPlugin } from './rich-text-plugin';
import type {
  KjBlockType,
  KjImageInsert,
  KjRichTextState,
  KjTextFormat,
} from './rich-text-editor.types';

const EMPTY_STATE: KjRichTextState = {
  activeFormats: new Set<KjTextFormat>(),
  blockType: 'paragraph',
  canUndo: false,
  canRedo: false,
  isLink: false,
  empty: true,
};

/**
 * Headless rich-text editor wrapping [Lexical](https://lexical.dev).
 *
 * Apply to a block element to turn it into an editable, accessible surface
 * (`role="textbox"`, `aria-multiline`). The Lexical engine is loaded lazily via
 * dynamic `import()` inside `afterNextRender`, so this directive is SSR-safe and
 * adds nothing to the initial bundle until it renders in the browser.
 *
 * Exposes reactive state signals (`isBold`, `blockType`, `canUndo`, …) and
 * imperative commands (`toggleFormat`, `setBlock`, `toggleLink`, …) for a
 * toolbar to bind to, and implements {@link ControlValueAccessor} (HTML string
 * model) for use with Angular forms.
 *
 * @example
 * ```html
 * <div kjRichTextEditor #ed="kjRichTextEditor" [(ngModel)]="html"></div>
 * <button (click)="ed.toggleFormat('bold')" [attr.aria-pressed]="ed.isBold()">B</button>
 * ```
 * @doc-category Core/Forms
 * @doc
 * @doc-name rich-text-editor
 * @doc-description Headless Lexical-powered rich-text editor directive with reactive state and form control support.
 * @doc-is-main
 */
@Directive({
  selector: '[kjRichTextEditor]',
  standalone: true,
  exportAs: 'kjRichTextEditor',
  host: {
    role: 'textbox',
    'aria-multiline': 'true',
    '[attr.spellcheck]': 'kjSpellcheck()',
    '[attr.aria-readonly]': 'kjReadonly() ? "true" : null',
    '[attr.aria-disabled]': 'disabledState() ? "true" : null',
    '[attr.data-empty]': 'empty() ? "true" : null',
    '(blur)': 'onTouched()',
  },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => KjRichTextEditor), multi: true },
  ],
})
export class KjRichTextEditor implements ControlValueAccessor {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  /** Initial content as an HTML string. Ongoing edits are reported via outputs / forms. */
  readonly kjValue = input<string>('');
  /** Additional plugins appended to the built-in set (history, lists, markdown). */
  readonly kjPlugins = input<readonly KjRichTextPlugin[]>([]);
  /** Makes the editor non-editable while still selectable. */
  readonly kjReadonly = input<boolean>(false);
  /** Native spellcheck toggle. */
  readonly kjSpellcheck = input<boolean>(true);
  /** Lexical namespace (diagnostics only). */
  readonly kjNamespace = input<string>('kj-rich-text');

  /** Emits the serialized HTML whenever the document changes. */
  readonly valueChange = output<string>();
  /** Emits the plain-text content whenever the document changes. */
  readonly textChange = output<string>();
  /** Emits the Lexical `SerializedEditorState` whenever the document changes. */
  readonly jsonChange = output<SerializedEditorState>();

  private readonly editorSig = signal<LexicalEditor | null>(null);
  /** The live Lexical editor instance, or `null` before initialization. */
  readonly editor = this.editorSig.asReadonly();

  /** Current formatting state derived from the selection. */
  readonly state = signal<KjRichTextState>(EMPTY_STATE);
  readonly isBold = computed(() => this.state().activeFormats.has('bold'));
  readonly isItalic = computed(() => this.state().activeFormats.has('italic'));
  readonly isUnderline = computed(() => this.state().activeFormats.has('underline'));
  readonly isStrikethrough = computed(() => this.state().activeFormats.has('strikethrough'));
  readonly isCode = computed(() => this.state().activeFormats.has('code'));
  readonly blockType = computed<KjBlockType>(() => this.state().blockType);
  readonly canUndo = computed(() => this.state().canUndo);
  readonly canRedo = computed(() => this.state().canRedo);
  readonly isLink = computed(() => this.state().isLink);
  readonly empty = computed(() => this.state().empty);

  /** @internal CVA disabled flag. */
  readonly disabledState = signal(false);

  private engine: RichTextEngine | null = null;
  private pendingValue: string | null = null;
  private lastHtml = '';
  private applyingExternal = false;
  private destroyed = false;

  private onChange: (value: string) => void = () => {};
  /** @internal blur handler wired via host bindings. */
  onTouched: () => void = () => {};

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.engine?.destroy();
      this.engine = null;
    });

    // React to readonly / disabled input changes after the engine exists.
    effect(() => {
      const editable = !this.kjReadonly() && !this.disabledState();
      this.engine?.setEditable(editable);
    });

    afterNextRender(async () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const { createRichTextEngine } = await import('./engine');
      if (this.destroyed) return;
      const initial = this.pendingValue ?? this.kjValue();
      this.applyingExternal = true;
      const engine = createRichTextEngine(
        this.el.nativeElement,
        {
          initialHtml: initial,
          plugins: this.kjPlugins(),
          namespace: this.kjNamespace(),
        },
        {
          onState: (s) => this.state.set(s),
          onValue: (v) => this.emitValue(v.html, v.text, v.json),
        },
      );
      this.applyingExternal = false;
      this.engine = engine;
      this.editorSig.set(engine.editor);
      this.pendingValue = null;
      this.lastHtml = engine.getHtml();
      engine.setEditable(!this.kjReadonly() && !this.disabledState());
    });
  }

  private emitValue(html: string, text: string, json: SerializedEditorState): void {
    this.lastHtml = html;
    if (this.applyingExternal) return;
    this.onChange(html);
    this.valueChange.emit(html);
    this.textChange.emit(text);
    this.jsonChange.emit(json);
  }

  // -- commands (no-ops until initialized) ---------------------------------

  /** Toggle an inline text format on the selection. */
  toggleFormat(format: KjTextFormat): void {
    this.engine?.toggleFormat(format);
  }

  /** Convert the selected block(s) to a paragraph, heading, quote, or code block. */
  setBlock(block: Exclude<KjBlockType, 'bullet' | 'number'>): void {
    this.engine?.setBlock(block);
  }

  /** Toggle a bullet or numbered list on the selection. */
  toggleList(type: 'bullet' | 'number'): void {
    this.engine?.toggleList(type);
  }

  /** Wrap the selection in a link (or remove it when `url` is `null`/empty). */
  toggleLink(url: string | null): void {
    this.engine?.toggleLink(url);
  }

  /** Return the URL of the link at the selection, if any. */
  getSelectedLinkUrl(): string | null {
    return this.engine?.getSelectedLinkUrl() ?? null;
  }

  /** Insert a block image at the selection. */
  insertImage(image: KjImageInsert): void {
    this.engine?.insertImage(image);
  }

  /** Undo the last edit. */
  undo(): void {
    this.engine?.undo();
  }

  /** Redo the last undone edit. */
  redo(): void {
    this.engine?.redo();
  }

  /** Move focus into the editor. */
  focus(): void {
    this.engine?.focus();
  }

  /** Remove all content, leaving a single empty paragraph. */
  clear(): void {
    this.engine?.clear();
  }

  /** Serialize the current content to HTML. */
  getHtml(): string {
    return this.engine?.getHtml() ?? this.lastHtml;
  }

  /** Replace the content from an HTML string. */
  setHtml(html: string): void {
    this.writeValue(html);
  }

  /** Serialize the current content to a Lexical `SerializedEditorState`. */
  getJson(): SerializedEditorState | null {
    return this.engine?.getJson() ?? null;
  }

  /** Replace the content from a Lexical `SerializedEditorState`. */
  setJson(json: SerializedEditorState): void {
    if (!this.engine) return;
    this.applyingExternal = true;
    this.engine.setJson(json);
    this.applyingExternal = false;
  }

  // -- ControlValueAccessor ------------------------------------------------

  writeValue(value: string | null): void {
    const html = value ?? '';
    if (html === this.lastHtml) return;
    if (this.engine) {
      this.applyingExternal = true;
      this.engine.setHtml(html);
      this.applyingExternal = false;
      this.lastHtml = html;
    } else {
      this.pendingValue = html;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledState.set(isDisabled);
  }
}
