import {
  ApplicationRef,
  Directive,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  Injector,
  PLATFORM_ID,
  type Type,
  afterNextRender,
  computed,
  createComponent,
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
import type { KjRichTextFeature, KjRteOverlay, KjRteToolbarItem } from './feature';
import {
  KJ_RICH_TEXT,
  KJ_RICH_TEXT_FEATURES,
  KJ_RICH_TEXT_NODE,
  type KjDecoratorMountAdapter,
  type KjRichTextHost,
} from './rich-text.context';
import type { KjBlockType, KjRichTextState, KjTextFormat } from './rich-text-editor.types';

const EMPTY_STATE: KjRichTextState = {
  activeFormats: new Set<KjTextFormat>(),
  blockType: 'paragraph',
  canUndo: false,
  canRedo: false,
  isLink: false,
  empty: true,
};

/** Stable ordering for toolbar groups; unknown groups sort last, alphabetically. */
const GROUP_ORDER = ['format', 'block', 'list', 'insert', 'history'];

/** A resolved open overlay: its descriptor plus the data the feature passed. */
export interface KjActiveOverlay {
  readonly overlay: KjRteOverlay;
  readonly data: unknown;
}

/** A contiguous run of toolbar items sharing a group, for rendering. */
export interface KjRteToolbarGroup {
  readonly group: string;
  readonly items: readonly KjRteToolbarItem[];
}

/**
 * Headless, client-driven rich-text editor wrapping [Lexical](https://lexical.dev).
 *
 * Apply to a block element to turn it into an editable, accessible surface
 * (`role="textbox"`, `aria-multiline`). The editor is composed from **features**
 * (see {@link KjRichTextFeature}) supplied via {@link provideKjRichText}, the
 * `kjFeatures` input, or `[kjRichTextExtension]` child directives. Each feature
 * lazily loads its own `@lexical/*` package(s) in the browser, so disabling a
 * feature keeps its code out of the bundle. SSR-safe: the engine loads via
 * dynamic `import()` inside `afterNextRender`.
 *
 * Exposes the aggregated {@link toolbarItems}, reactive `state`, and imperative
 * helpers (`runItem`, `undo`, …) for a dynamic toolbar to bind to, and
 * implements {@link ControlValueAccessor} (HTML string model) for Angular forms.
 *
 * @doc-category Core/Forms
 * @doc
 * @doc-name rich-text-editor
 * @doc-description Headless, feature-composed Lexical rich-text editor directive with a dynamic toolbar contract and form support.
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
    { provide: KJ_RICH_TEXT, useExisting: forwardRef(() => KjRichTextEditor) },
  ],
})
export class KjRichTextEditor implements ControlValueAccessor, KjRichTextHost {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly appRef = inject(ApplicationRef);
  /** App-/scope-wide features contributed via {@link provideKjRichText}. */
  private readonly providedFeatures = inject(KJ_RICH_TEXT_FEATURES, { optional: true }) ?? [];
  /** Features registered by child directives via {@link registerFeature}. */
  private readonly childFeatures = signal<readonly KjRichTextFeature[]>([]);

  /** Initial content as an HTML string. Ongoing edits are reported via outputs / forms. */
  readonly kjValue = input<string>('');
  /** Per-instance features, merged with provided + child-registered features. */
  readonly kjFeatures = input<readonly KjRichTextFeature[]>([]);
  /** @deprecated Renamed to {@link kjFeatures}. Still honored (merged). */
  readonly kjExtensions = input<readonly KjRichTextFeature[]>([]);
  /** @deprecated Renamed to {@link kjFeatures}. Still honored (merged). */
  readonly kjPlugins = input<readonly KjRichTextFeature[]>([]);
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
  /** Emits messages a feature asked to announce to assistive technology. */
  readonly announce = output<string>();

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

  /** All active features (provided + inputs + child-registered). */
  private readonly features = computed<readonly KjRichTextFeature[]>(() => [
    ...this.providedFeatures,
    ...this.kjFeatures(),
    ...this.kjExtensions(),
    ...this.kjPlugins(),
    ...this.childFeatures(),
  ]);

  /** Toolbar items contributed by active features, sorted by group then order. */
  readonly toolbarItems = computed<readonly KjRteToolbarItem[]>(() =>
    this.features()
      .flatMap((feature) => feature.toolbar ?? [])
      .slice()
      .sort((a, b) => {
        const ga = GROUP_ORDER.indexOf(a.group);
        const gb = GROUP_ORDER.indexOf(b.group);
        const oa = ga === -1 ? GROUP_ORDER.length : ga;
        const ob = gb === -1 ? GROUP_ORDER.length : gb;
        if (oa !== ob) return oa - ob;
        if (a.group !== b.group) return a.group.localeCompare(b.group);
        return a.order - b.order;
      }),
  );

  /** Toolbar items grouped into contiguous runs (for rendering separators). */
  readonly toolbarGroups = computed<readonly KjRteToolbarGroup[]>(() => {
    const groups: { group: string; items: KjRteToolbarItem[] }[] = [];
    for (const item of this.toolbarItems()) {
      const last = groups[groups.length - 1];
      if (!last || last.group !== item.group) groups.push({ group: item.group, items: [item] });
      else last.items.push(item);
    }
    return groups;
  });

  /** Overlay descriptors contributed by active features. */
  private readonly overlays = computed<readonly KjRteOverlay[]>(() =>
    this.features().flatMap((feature) => feature.overlay ?? []),
  );

  /** The overlay currently open (opened by a feature), or `null`. */
  readonly activeOverlay = signal<KjActiveOverlay | null>(null);

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
      const engine = await createRichTextEngine(
        this.el.nativeElement,
        {
          initialHtml: initial,
          features: this.features(),
          namespace: this.kjNamespace(),
          mount: this.createMountAdapter(),
          onOverlayOpen: (id, data) => this.openOverlayById(id, data),
          onOverlayClose: () => this.activeOverlay.set(null),
          onAnnounce: (message) => this.announce.emit(message),
        },
        {
          onState: (s) => this.state.set(s),
          onValue: (v) => this.emitValue(v.html, v.text, v.json),
        },
      );
      this.applyingExternal = false;
      if (this.destroyed) {
        engine.destroy();
        return;
      }
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

  private openOverlayById(id: string, data: unknown): void {
    const overlay = this.overlays().find((o) => o.id === id);
    if (overlay) this.activeOverlay.set({ overlay, data });
  }

  // -- feature registration + toolbar API ----------------------------------

  /** {@inheritDoc KjRichTextHost.registerFeature} */
  registerFeature(feature: KjRichTextFeature): void {
    this.childFeatures.update((list) => [...list, feature]);
  }

  /** @deprecated Renamed to {@link registerFeature}. */
  registerExtension(feature: KjRichTextFeature): void {
    this.registerFeature(feature);
  }

  /** Run a toolbar item's action against the live editor (no-op until ready). */
  runItem(item: KjRteToolbarItem): void {
    if (this.engine) item.run(this.engine.context);
  }

  /** Whether a toggle toolbar item is currently active. */
  itemActive(item: KjRteToolbarItem): boolean {
    return item.kind === 'toggle' && !!item.isActive?.(this.state());
  }

  /** Whether a toolbar item is currently disabled. */
  itemDisabled(item: KjRteToolbarItem): boolean {
    return !!item.isDisabled?.(this.state());
  }

  /** Close any open feature overlay. */
  closeOverlay(): void {
    this.activeOverlay.set(null);
  }

  // -- imperative editor helpers -------------------------------------------

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

  /** Build the Angular mount adapter the engine uses for decorator-node components. */
  private createMountAdapter(): KjDecoratorMountAdapter {
    return {
      mount: (component, node) => {
        const elementInjector = Injector.create({
          parent: this.envInjector,
          providers: [{ provide: KJ_RICH_TEXT_NODE, useValue: node }],
        });
        const ref = createComponent(component as Type<unknown>, {
          environmentInjector: this.envInjector,
          elementInjector,
        });
        this.appRef.attachView(ref.hostView);
        return {
          element: ref.location.nativeElement as HTMLElement,
          destroy: () => {
            this.appRef.detachView(ref.hostView);
            ref.destroy();
          },
        };
      },
    };
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
