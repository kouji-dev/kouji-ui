import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import * as lexical from 'lexical';
import { $getRoot, $isTextNode } from 'lexical';
import * as richText from '@lexical/rich-text';
import { createRichTextEngine, type RichTextEngine } from './engine';
import { createKjDecoratorNode } from './decorator-node';
import type { KjRichTextFeature } from './feature';
import type { KjRichTextState } from './rich-text-editor.types';
import { KjRichTextEditor } from './rich-text-editor';
import { KjRichTextExtensionDirective } from './rich-text-extension';
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

  async function mount(config: Parameters<typeof createRichTextEngine>[1] = {}): Promise<void> {
    engine = await createRichTextEngine(host, config, {
      onState: (s) => (lastState = s),
      onValue: () => {},
    });
  }

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => {
    engine?.destroy();
    host.remove();
    lastState = undefined;
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
      imports: [KjRichTextExtensionDirective],
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
