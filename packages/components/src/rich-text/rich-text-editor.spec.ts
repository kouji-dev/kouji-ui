import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjRichTextEditorComponent } from './rich-text-editor';

@Component({
  standalone: true,
  imports: [KjRichTextEditorComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-rich-text-editor
      [kjLabel]="label"
      [kjLabelledBy]="labelledBy"
      [kjShowToolbar]="showToolbar()"
      kjToolbarLabel="My formatting"
    />
  `,
})
class HostComponent {
  label = 'Comment';
  labelledBy = '';
  showToolbar = signal(true);
}

describe('KjRichTextEditorComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root };
  }

  test('renders the editor host and content textbox', () => {
    const { root } = setup();
    expect(root.querySelector('kj-rich-text-editor')).not.toBeNull();
    const content = root.querySelector('.kj-rte__content')!;
    expect(content.getAttribute('role')).toBe('textbox');
    expect(content.getAttribute('aria-multiline')).toBe('true');
  });

  test('exposes an accessible toolbar', () => {
    const { root } = setup();
    const toolbar = root.querySelector('.kj-rte__toolbar')!;
    expect(toolbar.getAttribute('role')).toBe('toolbar');
    expect(toolbar.getAttribute('aria-label')).toBe('My formatting');
    // aria-controls points at the content region id.
    const content = root.querySelector('.kj-rte__content')!;
    expect(toolbar.getAttribute('aria-controls')).toBe(content.getAttribute('id'));
  });

  test('formatting buttons carry labels and pressed state', () => {
    const { root } = setup();
    const bold = root.querySelector('button[aria-label="Bold"]')!;
    expect(bold).not.toBeNull();
    expect(bold.getAttribute('aria-pressed')).toBe('false');
  });

  test('history buttons are disabled until edits exist', () => {
    const { root } = setup();
    const undo = root.querySelector('button[aria-label="Undo"]') as HTMLButtonElement;
    const redo = root.querySelector('button[aria-label="Redo"]') as HTMLButtonElement;
    expect(undo.disabled).toBe(true);
    expect(redo.disabled).toBe(true);
  });

  test('content uses aria-label by default', () => {
    const { root } = setup();
    const content = root.querySelector('.kj-rte__content')!;
    expect(content.getAttribute('aria-label')).toBe('Comment');
  });

  test('content prefers aria-labelledby when provided', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.labelledBy = 'ext-label';
    fixture.detectChanges();
    const content = fixture.nativeElement.querySelector('.kj-rte__content')!;
    expect(content.getAttribute('aria-labelledby')).toBe('ext-label');
    expect(content.getAttribute('aria-label')).toBeNull();
  });

  test('toolbar can be hidden', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.showToolbar.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kj-rte__toolbar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.kj-rte__content')).not.toBeNull();
  });
});
