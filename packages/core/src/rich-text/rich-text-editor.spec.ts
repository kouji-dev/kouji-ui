import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { $getRoot, $isTextNode } from 'lexical';
import { createRichTextEngine, type RichTextEngine } from './engine';
import type { KjRichTextState } from './rich-text-editor.types';
import { KjRichTextEditor } from './rich-text-editor';

/** Fully select the text of the first text node so formatting commands apply. */
function selectAllText(engine: RichTextEngine): void {
  engine.editor.update(
    () => {
      const node = $getRoot().getFirstDescendant();
      if ($isTextNode(node)) {
        node.select(0, node.getTextContentSize());
      }
    },
    { discrete: true },
  );
}

describe('RichTextEngine (commands + state)', () => {
  let host: HTMLDivElement;
  let engine: RichTextEngine;
  let lastState: KjRichTextState | undefined;
  let lastText = '';

  function mount(initialHtml?: string): void {
    engine = createRichTextEngine(
      host,
      { initialHtml },
      {
        onState: (s) => (lastState = s),
        onValue: (v) => {
          lastText = v.text;
        },
      },
    );
  }

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    engine?.destroy();
    host.remove();
    lastState = undefined;
    lastText = '';
  });

  test('parses initial HTML into html + text', () => {
    mount('<p>Hello world</p>');
    expect(engine.getHtml()).toContain('Hello world');
    expect(lastText).toContain('Hello world');
  });

  test('empty state reflects no content', () => {
    mount();
    expect(lastState?.empty).toBe(true);
    expect(lastState?.blockType).toBe('paragraph');
    expect(lastState?.canUndo).toBe(false);
  });

  test('setHtml replaces content and reports it', () => {
    mount('<p>one</p>');
    engine.setHtml('<p>two</p>');
    expect(engine.getHtml()).toContain('two');
    expect(engine.getHtml()).not.toContain('one');
    expect(lastState?.empty).toBe(false);
  });

  test('clear() empties the document', () => {
    mount('<p>content</p>');
    engine.clear();
    expect(engine.editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('');
    expect(lastState?.empty).toBe(true);
  });

  test('toggleFormat bold marks the selection bold', () => {
    mount('<p>bold me</p>');
    selectAllText(engine);
    engine.toggleFormat('bold');
    expect(lastState?.activeFormats.has('bold')).toBe(true);
    expect(engine.getHtml()).toMatch(/<(b|strong)/);
  });

  test('setBlock h1 converts the paragraph to a heading', () => {
    mount('<p>title</p>');
    selectAllText(engine);
    engine.setBlock('h1');
    expect(engine.getHtml()).toContain('<h1');
    expect(lastState?.blockType).toBe('h1');
  });

  test('setBlock quote and code produce the right blocks', () => {
    mount('<p>q</p>');
    selectAllText(engine);
    engine.setBlock('quote');
    expect(engine.getHtml()).toContain('<blockquote');
    expect(lastState?.blockType).toBe('quote');

    selectAllText(engine);
    engine.setBlock('code');
    expect(lastState?.blockType).toBe('code');
  });

  test('toggleList bullet then off', () => {
    mount('<p>item</p>');
    selectAllText(engine);
    engine.toggleList('bullet');
    expect(engine.getHtml()).toContain('<ul');
    expect(lastState?.blockType).toBe('bullet');

    selectAllText(engine);
    engine.toggleList('bullet');
    expect(lastState?.blockType).toBe('paragraph');
  });

  test('toggleLink wraps and unwraps the selection', () => {
    mount('<p>link me</p>');
    selectAllText(engine);
    engine.toggleLink('https://example.com');
    expect(engine.getHtml()).toContain('href="https://example.com"');
    expect(engine.getSelectedLinkUrl()).toBe('https://example.com');

    selectAllText(engine);
    engine.toggleLink(null);
    expect(engine.getHtml()).not.toContain('href=');
  });

  test('insertImage inserts an accessible image node', () => {
    mount('<p>x</p>');
    selectAllText(engine);
    engine.insertImage({ src: 'https://example.com/a.png', alt: 'An A' });
    const html = engine.getHtml();
    expect(html).toContain('<img');
    expect(html).toContain('alt="An A"');
  });

  test('undo restores the previous content', () => {
    mount('<p>start</p>');
    selectAllText(engine);
    engine.setBlock('h1');
    expect(engine.getHtml()).toContain('<h1');
    engine.undo();
    expect(engine.getHtml()).not.toContain('<h1');
  });

  test('JSON round-trips through get/setJson', () => {
    mount('<p>json content</p>');
    const json = engine.getJson();
    engine.clear();
    expect(engine.getHtml()).not.toContain('json content');
    engine.setJson(json);
    expect(engine.getHtml()).toContain('json content');
  });

  test('commands are inert after destroy', () => {
    mount('<p>done</p>');
    engine.destroy();
    // Should not throw.
    engine.toggleFormat('bold');
    engine.setBlock('h1');
    engine.undo();
  });
});

@Component({
  standalone: true,
  imports: [KjRichTextEditor],
  template: `<div kjRichTextEditor [kjReadonly]="readonly()" [kjSpellcheck]="false"></div>`,
})
class HostComponent {
  readonly readonly = signal(false);
}

describe('KjRichTextEditor directive (a11y host)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

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
