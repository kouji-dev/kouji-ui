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
