import { Component, signal } from '@angular/core';
import { render, waitFor } from '@testing-library/angular';
import { vi } from 'vitest';
import { KjEditor } from './editor';
import { provideMonaco } from './editor.providers';
import type { KjMonaco } from './editor.types';

/** Minimal Monaco stub recording the calls the directive makes. */
function makeFakeMonaco() {
  let contentCb: (() => void) | null = null;
  const model = {
    _value: '',
    _lang: 'plaintext',
    getValue: vi.fn(() => model._value),
    setValue: vi.fn((v: string) => {
      model._value = v;
    }),
    getLanguageId: vi.fn(() => model._lang),
    dispose: vi.fn(),
  };
  const editor = {
    getModel: vi.fn(() => model),
    getValue: vi.fn(() => model._value),
    onDidChangeModelContent: vi.fn((cb: () => void) => {
      contentCb = cb;
      return { dispose: vi.fn() };
    }),
    updateOptions: vi.fn(),
    focus: vi.fn(),
    layout: vi.fn(),
    trigger: vi.fn(),
    dispose: vi.fn(),
  };
  const create = vi.fn((_host: HTMLElement, opts: { value?: string; language?: string }) => {
    model._value = opts.value ?? '';
    model._lang = opts.language ?? 'plaintext';
    return editor;
  });
  const setModelLanguage = vi.fn((_m: unknown, lang: string) => {
    model._lang = lang;
  });
  const monaco = { editor: { create, setModelLanguage } } as unknown as KjMonaco;
  return {
    monaco,
    editor,
    model,
    create,
    setModelLanguage,
    /** Simulate the user typing `v` into Monaco. */
    type(v: string) {
      model._value = v;
      contentCb?.();
    },
  };
}

@Component({
  standalone: true,
  imports: [KjEditor],
  template: `<div
    kjEditor
    [(kjValue)]="code"
    [kjLanguage]="lang()"
    [kjReadonly]="ro()"
    [kjAriaLabel]="label()"
  ></div>`,
})
class Host {
  readonly code = signal('const a = 1;');
  readonly lang = signal('typescript');
  readonly ro = signal(false);
  readonly label = signal('My editor');
}

async function setup() {
  const fake = makeFakeMonaco();
  const view = await render(Host, {
    providers: [provideMonaco({ loader: () => Promise.resolve(fake.monaco) })],
  });
  await waitFor(() => expect(fake.create).toHaveBeenCalled());
  return { fake, view };
}

describe('KjEditor', () => {
  it('creates the editor with the initial value and language', async () => {
    const { fake } = await setup();
    expect(fake.create).toHaveBeenCalledTimes(1);
    const opts = fake.create.mock.calls[0][1];
    expect(opts.value).toBe('const a = 1;');
    expect(opts.language).toBe('typescript');
  });

  it('sets the host aria-label for an accessible name', async () => {
    const { view } = await setup();
    expect(view.container.querySelector('[kjEditor]')).toHaveAttribute('aria-label', 'My editor');
  });

  it('pushes external value changes into the model', async () => {
    const { fake, view } = await setup();
    view.fixture.componentInstance.code.set('const b = 2;');
    await waitFor(() => expect(fake.model.setValue).toHaveBeenCalledWith('const b = 2;'));
  });

  it('reflects typing back into the two-way value', async () => {
    const { fake, view } = await setup();
    fake.type('typed text');
    expect(view.fixture.componentInstance.code()).toBe('typed text');
  });

  it('switches the model language reactively', async () => {
    const { fake, view } = await setup();
    view.fixture.componentInstance.lang.set('css');
    await waitFor(() => expect(fake.setModelLanguage).toHaveBeenCalledWith(expect.anything(), 'css'));
  });

  it('applies option changes via updateOptions', async () => {
    const { fake, view } = await setup();
    view.fixture.componentInstance.ro.set(true);
    await waitFor(() =>
      expect(fake.editor.updateOptions).toHaveBeenCalledWith(
        expect.objectContaining({ readOnly: true }),
      ),
    );
  });

  it('disposes the editor and model on destroy', async () => {
    const { fake, view } = await setup();
    view.fixture.destroy();
    expect(fake.editor.dispose).toHaveBeenCalled();
    expect(fake.model.dispose).toHaveBeenCalled();
  });
});
