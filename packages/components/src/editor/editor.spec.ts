import { Component } from '@angular/core';
import { render, screen, waitFor } from '@testing-library/angular';
import { vi } from 'vitest';
import { provideMonaco, type KjMonaco } from '@kouji-ui/core';
import { KjEditorComponent } from './editor';

function makeFakeMonaco() {
  const model = {
    _value: '',
    getValue: vi.fn(() => model._value),
    setValue: vi.fn((v: string) => {
      model._value = v;
    }),
    getLanguageId: vi.fn(() => 'typescript'),
    dispose: vi.fn(),
  };
  const editor = {
    getModel: vi.fn(() => model),
    getValue: vi.fn(() => model._value),
    onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeCursorPosition: vi.fn(() => ({ dispose: vi.fn() })),
    updateOptions: vi.fn(),
    focus: vi.fn(),
    layout: vi.fn(),
    trigger: vi.fn(),
    dispose: vi.fn(),
  };
  const monaco = {
    editor: {
      create: vi.fn((_host: HTMLElement, opts: { value?: string }) => {
        model._value = opts.value ?? '';
        return editor;
      }),
      setModelLanguage: vi.fn(),
      defineTheme: vi.fn(),
      setTheme: vi.fn(),
    },
  } as unknown as KjMonaco;
  return { monaco, editor };
}

async function setup(inputs: Record<string, unknown> = {}) {
  const fake = makeFakeMonaco();
  const view = await render(KjEditorComponent, {
    inputs: { kjValue: 'const a = 1;', kjLanguage: 'typescript', ...inputs },
    providers: [provideMonaco({ loader: () => Promise.resolve(fake.monaco) })],
  });
  return { fake, view };
}

describe('KjEditorComponent', () => {
  it('renders the toolbar with the language label', async () => {
    await setup();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('mounts Monaco and clears the loading region', async () => {
    const { fake } = await setup();
    await waitFor(() => expect(fake.editor.onDidChangeCursorPosition).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('defines and applies a kj-derived Monaco theme', async () => {
    const { fake } = await setup();
    await waitFor(() =>
      expect(fake.monaco.editor.defineTheme as ReturnType<typeof vi.fn>).toHaveBeenCalled(),
    );
    expect(fake.monaco.editor.setTheme).toHaveBeenCalled();
  });

  it('hides the toolbar when kjShowToolbar is false', async () => {
    await setup({ kjShowToolbar: false });
    expect(screen.queryByText('typescript')).not.toBeInTheDocument();
  });

  it('exposes a copy button with an accessible label', async () => {
    await setup();
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
  });
});

// arch F-2 — every boolean on this wrapper was a plain `input<boolean>(…)`,
// so `<kj-editor kjReadonly>` (the form the docs teach) bound '' and stayed
// editable, and `kjShowToolbar="false"` bound the truthy string 'false'.
describe('KjEditorComponent — bare boolean attributes (arch F-2)', () => {
  it('a bare kjReadonly attribute reaches Monaco', async () => {
    const fake = makeFakeMonaco();
    @Component({
      standalone: true,
      imports: [KjEditorComponent],
      template: `<kj-editor kjValue="x" kjReadonly kjMinimap />`,
    })
    class Host {}
    await render(Host, {
      providers: [provideMonaco({ loader: () => Promise.resolve(fake.monaco) })],
    });
    const create = fake.monaco.editor.create as unknown as ReturnType<typeof vi.fn>;
    await waitFor(() => expect(create).toHaveBeenCalled());
    const opts = create.mock.calls[0][1] as { readOnly?: boolean; minimap?: { enabled: boolean } };
    expect(opts.readOnly).toBe(true);
    expect(opts.minimap).toEqual({ enabled: true });
  });

  it('kjShowToolbar="false" hides the toolbar, as booleanAttribute reads it', async () => {
    const fake = makeFakeMonaco();
    @Component({
      standalone: true,
      imports: [KjEditorComponent],
      template: `<kj-editor kjValue="x" kjLanguage="typescript" kjShowToolbar="false" />`,
    })
    class Host {}
    const { container } = await render(Host, {
      providers: [provideMonaco({ loader: () => Promise.resolve(fake.monaco) })],
    });
    expect(container.querySelector('.kj-editor-toolbar')).toBeNull();
  });

  it('shares ONE theme MutationObserver across editors', async () => {
    const RealMO = globalThis.MutationObserver;
    let themeObservations = 0;
    globalThis.MutationObserver = class extends RealMO {
      // Count only theme observations on <html>: other library services
      // legitimately observe other things.
      override observe(target: Node, init?: MutationObserverInit) {
        if (target === document.documentElement && init?.attributeFilter?.includes('data-theme')) {
          themeObservations++;
        }
        super.observe(target, init);
      }
    };
    try {
      const fake = makeFakeMonaco();
      @Component({
        standalone: true,
        imports: [KjEditorComponent],
        template: `
          <kj-editor kjValue="a" />
          <kj-editor kjValue="b" />
          <kj-editor kjValue="c" />
        `,
      })
      class Host {}
      await render(Host, {
        providers: [provideMonaco({ loader: () => Promise.resolve(fake.monaco) })],
      });
      // Three editors used to mean three observers on <html>.
      expect(themeObservations).toBe(1);
    } finally {
      globalThis.MutationObserver = RealMO;
    }
  });

  it('re-applies the Monaco theme when the app theme switches', async () => {
    const { fake } = await setup();
    await waitFor(() =>
      expect(fake.monaco.editor.setTheme as ReturnType<typeof vi.fn>).toHaveBeenCalled(),
    );
    (fake.monaco.editor.setTheme as ReturnType<typeof vi.fn>).mockClear();

    document.documentElement.setAttribute('data-theme', 'dark');
    await waitFor(() =>
      expect(fake.monaco.editor.setTheme as ReturnType<typeof vi.fn>).toHaveBeenCalled(),
    );
    document.documentElement.removeAttribute('data-theme');
  });
});
