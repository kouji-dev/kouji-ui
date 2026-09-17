import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import * as lexical from 'lexical';
import { $getRoot, $isTextNode } from 'lexical';
import * as richText from '@lexical/rich-text';
import {
  createRichTextEngine,
  type KjRichTextValueSnapshot,
  type RichTextEngine,
} from './engine';
import { createKjDecoratorNode } from './decorator-node';
import type { KjRichTextFeature } from './feature';
import type { KjRichTextState } from './rich-text-editor.types';
import { KjRichTextEditor } from './rich-text-editor';
import { KjRichTextFeatureDirective } from './rich-text-feature';
import {
  KJ_RICH_TEXT,
  provideKjRichText,
  KJ_RICH_TEXT_FEATURES,
  type KjDecoratorMountAdapter,
  type KjRichTextHost,
} from './rich-text.context';

@Component({ selector: 'kj-test-chip', standalone: true, template: `chip` })
class TestChip {}

/** Fully select the first text node so formatting commands apply. */
function selectAllText(engine: RichTextEngine): void {
  engine.editor.update(
    () => {
      const node = $getRoot().getFirstDescendant();
      if ($isTextNode(node)) node.select(0, node.getTextContentSize());
    },
    { discrete: true },
  );
}

/** A heading feature built from statically-imported @lexical/rich-text (test only). */
function headingFeature(loadSpy?: () => void): KjRichTextFeature {
  return {
    name: 'heading',
    load: loadSpy
      ? async () => {
          loadSpy();
        }
      : undefined,
    nodes: () => [richText.HeadingNode],
    toolbar: [
      {
        id: 'h1',
        group: 'block',
        order: 0,
        icon: 'heading-1',
        label: 'Heading 1',
        kind: 'toggle',
        isActive: (s) => s.blockType === 'h1',
        run: (ctx) => ctx.setBlock(() => richText.$createHeadingNode('h1')),
      },
    ],
  };
}

describe('RichTextEngine (feature-composed)', () => {
  let host: HTMLDivElement;
  let engine: RichTextEngine;
  let lastState: KjRichTextState | undefined;
  let values: KjRichTextValueSnapshot[] = [];

  async function mount(config: Parameters<typeof createRichTextEngine>[1] = {}): Promise<void> {
    engine = await createRichTextEngine(host, config, {
      onState: (s) => (lastState = s),
      onValue: (v) => values.push(v),
    });
  }

  /** Append a paragraph, committing one update synchronously. */
  function appendParagraph(text: string): void {
    engine.editor.update(
      () => {
        const para = lexical.$createParagraphNode();
        para.append(lexical.$createTextNode(text));
        $getRoot().append(para);
      },
      { discrete: true },
    );
  }

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    values = [];
  });
  afterEach(() => {
    engine?.destroy();
    host.remove();
    lastState = undefined;
    values = [];
  });

  test('base editing works with zero features (bold via context)', async () => {
    await mount({ initialHtml: '<p>bold me</p>' });
    selectAllText(engine);
    engine.context.toggleInlineFormat('bold');
    expect(lastState?.activeFormats.has('bold')).toBe(true);
    expect(engine.getHtml()).toMatch(/<(b|strong)/);
  });

  test('feature load() is awaited and its nodes collected before createEditor', async () => {
    const loadSpy = vi.fn();
    await mount({ initialHtml: '<p>title</p>', features: [headingFeature(loadSpy)] });
    expect(loadSpy).toHaveBeenCalledTimes(1);
    selectAllText(engine);
    // Inserting a heading only works if HeadingNode was registered.
    engine.context.setBlock(() => richText.$createHeadingNode('h1'));
    expect(engine.getHtml()).toContain('<h1');
    expect(lastState?.blockType).toBe('h1');
  });

  test('block type is derived package-agnostically', async () => {
    await mount({ initialHtml: '<p>x</p>', features: [headingFeature()] });
    selectAllText(engine);
    engine.context.setBlock(() => richText.$createHeadingNode('h1'));
    expect(lastState?.blockType).toBe('h1');
    selectAllText(engine);
    engine.context.setParagraph();
    expect(lastState?.blockType).toBe('paragraph');
  });

  test('feature setup teardown runs on destroy', async () => {
    const teardown = vi.fn();
    const feature: KjRichTextFeature = { name: 'x', setup: () => teardown };
    await mount({ features: [feature] });
    expect(teardown).not.toHaveBeenCalled();
    engine.destroy();
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  test('a feature can open an overlay through the context', async () => {
    const onOverlayOpen = vi.fn();
    const feature: KjRichTextFeature = {
      name: 'ov',
      toolbar: [
        {
          id: 'ov',
          group: 'insert',
          order: 0,
          icon: 'link',
          label: 'Open',
          kind: 'button',
          run: (ctx) => ctx.openOverlay('ov', { hello: 1 }),
        },
      ],
    };
    await mount({ features: [feature], onOverlayOpen });
    feature.toolbar![0].run(engine.context);
    expect(onOverlayOpen).toHaveBeenCalledWith('ov', { hello: 1 });
  });

  test('mounts and disposes an Angular component for a decorator node', async () => {
    const badge = createKjDecoratorNode(lexical, {
      type: 'test-decorator',
      component: TestChip,
      inline: true,
    });
    const mount = vi.fn();
    const destroy = vi.fn();
    const adapter: KjDecoratorMountAdapter = {
      mount: (component, node) => {
        mount(component, node);
        return { element: document.createElement('span'), destroy };
      },
    };
    engine = await createRichTextEngine(
      host,
      {
        initialHtml: '<p>x</p>',
        features: [
          {
            name: 'badge',
            nodes: () => [badge.Node],
            decorators: [{ nodeType: 'test-decorator', component: TestChip }],
          },
        ],
        mount: adapter,
      },
      { onState: () => {}, onValue: () => {} },
    );
    engine.editor.update(
      () => {
        $getRoot().selectEnd();
        lexical.$insertNodes([badge.$create({ label: 'y' })]);
      },
      { discrete: true },
    );
    expect(mount).toHaveBeenCalledTimes(1);
    expect(mount.mock.calls[0][0]).toBe(TestChip);
    engine.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  test('a committed update hands back html eagerly, text and json as thunks', async () => {
    // perf F-2: the listener used to serialise HTML, plain text AND JSON on
    // every committed update — including selection-only ones.
    await mount({ initialHtml: '<p>hello</p>' });
    values = [];
    appendParagraph('world');

    expect(values).toHaveLength(1);
    const value = values[0]!;
    expect(typeof value.html).toBe('string');
    expect(value.html).toContain('hello');
    expect(typeof value.text).toBe('function');
    expect(typeof value.json).toBe('function');
    // …and the thunks still answer correctly, after the update that made them.
    expect(value.text()).toContain('world');
    expect(value.json().root).toBeDefined();
  });

  test('a committed update never materialises the document text', async () => {
    await mount({ initialHtml: '<p>hello</p>' });
    let rootProto: object | null = null;
    engine.editor.getEditorState().read(() => {
      rootProto = Object.getPrototypeOf($getRoot()) as object;
    });
    const textContent = vi.spyOn(
      rootProto as unknown as { getTextContent: () => string },
      'getTextContent',
    );

    appendParagraph('world');

    // Lexical reads the root's text content twice per commit on its own, to
    // feed its text-content listeners. The engine used to add two more — the
    // eager `text` in the value payload and `readState`'s emptiness check — on
    // top of the HTML serialisation, which is inherent (it is the form value).
    const lexicalsOwnReads = 2;
    expect(textContent.mock.calls).toHaveLength(lexicalsOwnReads);
    textContent.mockRestore();
  });

  test('empty tracks the document without walking all of it', async () => {
    await mount();
    expect(lastState?.empty).toBe(true);

    appendParagraph('now there is text');
    expect(lastState?.empty).toBe(false);

    engine.clear();
    expect(lastState?.empty).toBe(true);
  });

  test('two empty paragraphs are not an empty document', async () => {
    // Preserves the previous `root.getTextContent().length === 0` semantics: the
    // separator Lexical emits between block children counts as content.
    await mount({ initialHtml: '<p></p><p></p>' });
    expect(lastState?.empty).toBe(false);
  });

  test('HTML round-trips and clear empties the document', async () => {
    await mount({ initialHtml: '<p>hello world</p>' });
    expect(engine.getHtml()).toContain('hello world');
    engine.clear();
    expect(engine.editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('');
  });
});

// -- directive -----------------------------------------------------------

@Component({
  standalone: true,
  imports: [KjRichTextEditor],
  template: `<div kjRichTextEditor [kjReadonly]="readonly()" [kjSpellcheck]="false"></div>`,
})
class HostComponent {
  readonly readonly = signal(false);
}

describe('KjRichTextEditor directive', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [HostComponent] }));

  test('exposes textbox role and aria-multiline', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[kjRichTextEditor]')!;
    expect(el.getAttribute('role')).toBe('textbox');
    expect(el.getAttribute('aria-multiline')).toBe('true');
    expect(el.getAttribute('spellcheck')).toBe('false');
  });

  test('reflects readonly as aria-readonly', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[kjRichTextEditor]')!;
    expect(el.getAttribute('aria-readonly')).toBe('true');
  });

  // arch F-2: the bare-attribute form binds the empty string, which is falsy —
  // without `booleanAttribute` these silently stayed at their defaults.
  test('bare kjReadonly / kjSpellcheck attributes are honoured', () => {
    @Component({
      standalone: true,
      imports: [KjRichTextEditor],
      template: `<div kjRichTextEditor kjReadonly kjSpellcheck></div>`,
    })
    class BareHost {}

    TestBed.configureTestingModule({ imports: [BareHost] });
    const fixture = TestBed.createComponent(BareHost);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[kjRichTextEditor]')!;
    expect(el.getAttribute('aria-readonly')).toBe('true');
    expect(el.getAttribute('contenteditable')).toBe('false');
    expect(el.getAttribute('spellcheck')).toBe('true');
  });
});

@Component({
  standalone: true,
  imports: [KjRichTextEditor],
  providers: [provideKjRichText(headingFeature())],
  template: `<div kjRichTextEditor></div>`,
})
class ToolbarHost {}

describe('feature composition → toolbar contract', () => {
  test('aggregates + groups provided features into sorted toolbar items', () => {
    TestBed.configureTestingModule({ imports: [ToolbarHost] });
    const fixture = TestBed.createComponent(ToolbarHost);
    fixture.detectChanges();
    const ed = fixture.debugElement
      .query(By.directive(KjRichTextEditor))
      .injector.get(KjRichTextEditor);
    expect(ed.toolbarItems().map((i) => i.id)).toContain('h1');
    expect(ed.toolbarGroups().some((g) => g.group === 'block')).toBe(true);
  });

  test('provideKjRichText returns multi providers for the features token', () => {
    const feature: KjRichTextFeature = { name: 'a' };
    const providers = provideKjRichText(feature) as Array<{
      provide: unknown;
      multi: boolean;
      useValue: unknown;
    }>;
    expect(providers).toHaveLength(1);
    expect(providers[0].provide).toBe(KJ_RICH_TEXT_FEATURES);
    expect(providers[0].multi).toBe(true);
    expect(providers[0].useValue).toBe(feature);
  });

  test('the feature directive registers exactly once, even after the input changes', () => {
    // arch F-13: the registration moved off `ngOnInit` onto an effect. The
    // effect tracks the input, so the guard below is what keeps `registerFeature`
    // (which appends) from double-registering on a later change.
    const registered: KjRichTextFeature[] = [];
    const fakeHost: KjRichTextHost = {
      editor: signal(null),
      state: signal({
        activeFormats: new Set(),
        blockType: 'paragraph',
        canUndo: false,
        canRedo: false,
        isLink: false,
        empty: true,
      }),
      toolbarItems: signal([]),
      registerFeature: (f) => registered.push(f),
    };

    @Component({
      standalone: true,
      imports: [KjRichTextFeatureDirective],
      providers: [{ provide: KJ_RICH_TEXT, useValue: fakeHost }],
      template: `<div [kjRichTextFeature]="feature()"></div>`,
    })
    class ExtHost {
      readonly feature = signal<KjRichTextFeature>({ name: 'first' });
    }

    TestBed.configureTestingModule({ imports: [ExtHost] });
    const fixture = TestBed.createComponent(ExtHost);
    fixture.detectChanges();
    expect(registered.map((f) => f.name)).toEqual(['first']);

    fixture.componentInstance.feature.set({ name: 'second' });
    fixture.detectChanges();
    expect(registered.map((f) => f.name)).toEqual(['first']);
  });

  test('the feature directive registers with the host on init', () => {
    const registered: KjRichTextFeature[] = [];
    const fakeHost: KjRichTextHost = {
      editor: signal(null),
      state: signal({
        activeFormats: new Set(),
        blockType: 'paragraph',
        canUndo: false,
        canRedo: false,
        isLink: false,
        empty: true,
      }),
      toolbarItems: signal([]),
      registerFeature: (f) => registered.push(f),
    };

    @Component({
      standalone: true,
      imports: [KjRichTextFeatureDirective],
      providers: [{ provide: KJ_RICH_TEXT, useValue: fakeHost }],
      template: `<div [kjRichTextFeature]="feature"></div>`,
    })
    class ExtHost {
      feature: KjRichTextFeature = { name: 'z' };
    }

    TestBed.configureTestingModule({ imports: [ExtHost] });
    const fixture = TestBed.createComponent(ExtHost);
    fixture.detectChanges();
    expect(registered).toHaveLength(1);
    expect(registered[0].name).toBe('z');
  });
});

// -- output coalescing ---------------------------------------------------

@Component({
  standalone: true,
  imports: [KjRichTextEditor],
  template: `<div
    kjRichTextEditor
    kjValue="<p>seed</p>"
    (valueChange)="values.push($event)"
    (textChange)="texts.push($event)"
    (jsonChange)="jsons.push($event)"
  ></div>`,
})
class EmitHost {
  readonly values: string[] = [];
  readonly texts: string[] = [];
  readonly jsons: unknown[] = [];
}

describe('KjRichTextEditor value outputs', () => {
  test('valueChange is synchronous; textChange / jsonChange coalesce to one frame', async () => {
    // perf F-2: the plain text and the JSON are each another full-document walk,
    // and only their latest value is meaningful — so a burst of updates pays for
    // them once per frame, while the form value stays synchronous.
    TestBed.configureTestingModule({ imports: [EmitHost] });
    const fixture = TestBed.createComponent(EmitHost);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();

    const ed = fixture.debugElement
      .query(By.directive(KjRichTextEditor))
      .injector.get(KjRichTextEditor);
    const editor = ed.editor();
    expect(editor).not.toBeNull();
    // jsdom cannot measure a text node, and Lexical re-applies the DOM selection
    // after every commit — drop the selection so the commits stay headless.
    editor!.update(() => lexical.$setSelection(null), { discrete: true });
    // …and let the frame that commit scheduled run before the spy goes in.
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const frames: FrameRequestCallback[] = [];
    const raf = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        frames.push(cb);
        return frames.length;
      });

    const host = fixture.componentInstance;
    host.values.length = 0;
    host.texts.length = 0;
    host.jsons.length = 0;

    for (const word of ['one', 'two', 'three']) {
      editor!.update(
        () => {
          const para = lexical.$createParagraphNode();
          para.append(lexical.$createTextNode(word));
          $getRoot().append(para);
        },
        { discrete: true },
      );
    }

    expect(host.values).toHaveLength(3);
    expect(host.texts).toHaveLength(0);
    expect(host.jsons).toHaveLength(0);
    expect(frames).toHaveLength(1);

    frames[0]!(0);
    expect(host.texts).toHaveLength(1);
    expect(host.jsons).toHaveLength(1);
    expect(host.texts[0]).toContain('three');

    raf.mockRestore();
    fixture.destroy();
  });

  test('a pending emission is dropped when the editor is destroyed', async () => {
    TestBed.configureTestingModule({ imports: [EmitHost] });
    const fixture = TestBed.createComponent(EmitHost);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();

    const ed = fixture.debugElement
      .query(By.directive(KjRichTextEditor))
      .injector.get(KjRichTextEditor);
    const editor = ed.editor();

    const frames: FrameRequestCallback[] = [];
    const raf = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        frames.push(cb);
        return frames.length;
      });
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});

    const host = fixture.componentInstance;
    host.texts.length = 0;
    editor!.update(
      () => {
        $getRoot().append(lexical.$createParagraphNode());
      },
      { discrete: true },
    );
    expect(frames).toHaveLength(1);

    fixture.destroy();
    expect(cancel).toHaveBeenCalled();
    frames[0]!(0);
    expect(host.texts).toHaveLength(0);

    raf.mockRestore();
    cancel.mockRestore();
  });
});
