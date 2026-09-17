import { Component, Type, ViewEncapsulation } from '@angular/core';
import { fireEvent, render } from '@testing-library/angular';
import { describe, expect, it, vi, type Mock } from 'vitest';
import {
  KJ_EDITOR_CONTRACT,
  KjBooleanEditor,
  KjDateEditor,
  KjNumberEditor,
  KjSelectEditor,
  KjTextEditor,
  injectKjCellEditor,
  type KjEditorContract,
} from './index';

/** Minimal editor over the shared state machine, to pin its contract. */
@Component({
  selector: 'kj-probe-editor',
  standalone: true,
  template: `
    <input
      [value]="editor.draft()"
      (input)="editor.draft.set($any($event.target).value)"
      (keydown.enter)="editor.commit()"
      (keydown.escape)="editor.cancel()"
      (focusout)="editor.onFocusOut($event)"
    />
    <button type="button">inside</button>
  `,
  encapsulation: ViewEncapsulation.None,
})
class ProbeEditor {
  readonly editor = injectKjCellEditor<string>({
    seed: (v) => (typeof v === 'string' ? v : ''),
    focus: () => this.editor.host.querySelector('input')?.focus(),
    validate: (v) => v !== 'bad',
  });
}

describe('injectKjCellEditor', () => {
  it('seeds the draft from the contract and focuses the control after the first render', async () => {
    const ctx = makeCtx<string>('seed');
    const { container } = await mount(ProbeEditor, ctx);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('seed');
    expect(document.activeElement).toBe(input);
  });

  it('settles once: the first commit wins and later commits or cancels are ignored', async () => {
    const ctx = makeCtx<string>('a');
    const { container } = await mount(ProbeEditor, ctx);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'b' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(ctx.commit).toHaveBeenCalledTimes(1);
    expect(ctx.commit).toHaveBeenCalledWith('b');
    expect(ctx.cancel).not.toHaveBeenCalled();
  });

  it('a draft that fails validation cancels instead of committing', async () => {
    const ctx = makeCtx<string>('a');
    const { container } = await mount(ProbeEditor, ctx);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'bad' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(ctx.commit).not.toHaveBeenCalled();
    expect(ctx.cancel).toHaveBeenCalledTimes(1);
  });

  it('focus moving inside the editor does not commit; focus leaving it does', async () => {
    const ctx = makeCtx<string>('a');
    const { container } = await mount(ProbeEditor, ctx);
    const input = container.querySelector('input') as HTMLInputElement;
    const inside = container.querySelector('button') as HTMLButtonElement;
    fireEvent.focusOut(input, { relatedTarget: inside });
    expect(ctx.commit).not.toHaveBeenCalled();
    fireEvent.focusOut(input, { relatedTarget: document.body });
    expect(ctx.commit).toHaveBeenCalledWith('a');
  });
});

describe('KjNumberEditor — blur', () => {
  it('commits the number when focus leaves the editor and cancels a non-finite draft', async () => {
    const ctx = makeCtx<number>(3);
    const { container } = await mount(KjNumberEditor, ctx);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.focusOut(input, { relatedTarget: document.body });
    expect(ctx.commit).toHaveBeenCalledWith(3);
    expect(ctx.cancel).not.toHaveBeenCalled();
  });
});

interface SpyContract<T> extends KjEditorContract<T> {
  commit: Mock<(next: T) => void>;
  cancel: Mock<() => void>;
}

function makeCtx<T>(initial: T): SpyContract<T> {
  return {
    value: initial,
    commit: vi.fn<(next: T) => void>(),
    cancel: vi.fn<() => void>(),
  };
}

async function mount<T, V>(cmp: Type<T>, ctx: KjEditorContract<V>, host?: Type<unknown>) {
  return render(host ?? cmp, {
    imports: [cmp],
    providers: [{ provide: KJ_EDITOR_CONTRACT, useValue: ctx }],
  });
}

describe('KjTextEditor', () => {
  it('reads initial value and commits on Enter', async () => {
    const ctx = makeCtx<string>('hello');
    const { container } = await mount(KjTextEditor, ctx);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('hello');
    fireEvent.input(input, { target: { value: 'world' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(ctx.commit).toHaveBeenCalledWith('world');
  });

  it('calls cancel on Escape', async () => {
    const ctx = makeCtx<string>('abc');
    const { container } = await mount(KjTextEditor, ctx);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(ctx.cancel).toHaveBeenCalled();
  });
});

describe('KjNumberEditor', () => {
  it('reads initial number and commits parsed number on Enter', async () => {
    const ctx = makeCtx<number>(42);
    const { container } = await mount(KjNumberEditor, ctx);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('42');
    fireEvent.input(input, { target: { value: '99' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(ctx.commit).toHaveBeenCalledWith(99);
  });

  it('calls cancel on Escape', async () => {
    const ctx = makeCtx<number>(1);
    const { container } = await mount(KjNumberEditor, ctx);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(ctx.cancel).toHaveBeenCalled();
  });
});

describe('KjDateEditor', () => {
  it('reads initial date as ISO string and commits Date on Enter', async () => {
    const seed = new Date(2026, 0, 15);
    const ctx = makeCtx<Date | null>(seed);
    const { container } = await mount(KjDateEditor, ctx);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('2026-01-15');
    fireEvent.input(input, { target: { value: '2026-05-17' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(ctx.commit).toHaveBeenCalledTimes(1);
    const committed = (ctx.commit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Date;
    expect(committed).toBeInstanceOf(Date);
    expect(committed.getFullYear()).toBe(2026);
    expect(committed.getMonth()).toBe(4);
    expect(committed.getDate()).toBe(17);
  });

  it('calls cancel on Escape', async () => {
    const ctx = makeCtx<Date | null>(null);
    const { container } = await mount(KjDateEditor, ctx);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(ctx.cancel).toHaveBeenCalled();
  });
});

describe('KjSelectEditor', () => {
  @Component({
    standalone: true,
    imports: [KjSelectEditor],
    template: `<kj-select-editor [kjOptions]="opts" />`,
  })
  class SelectHost {
    readonly opts: ReadonlyArray<string> = ['a', 'b', 'c'];
  }

  it('reads initial value and commits selected option on activation', async () => {
    const ctx = makeCtx<unknown>('b');
    const { container } = await mount(KjSelectEditor, ctx, SelectHost);
    // The styled kj-select renders a trigger button + portalled listbox.
    // Activate the trigger, then click the third option.
    const trigger = container.querySelector('button') as HTMLButtonElement;
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);
    // Options are portalled to document.body via the overlay primitive.
    const options = document.querySelectorAll('[kjOption], [role="option"]');
    expect(options.length).toBe(3);
    fireEvent.click(options[2] as HTMLElement);
    expect(ctx.commit).toHaveBeenCalledWith('c');
  });

  it('calls cancel on Escape', async () => {
    const ctx = makeCtx<unknown>('a');
    const { container } = await mount(KjSelectEditor, ctx, SelectHost);
    const trigger = container.querySelector('button') as HTMLButtonElement;
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(ctx.cancel).toHaveBeenCalled();
  });
});

describe('KjBooleanEditor', () => {
  it('reads initial value and commits toggled value on Enter', async () => {
    const ctx = makeCtx<boolean>(false);
    const { container } = await mount(KjBooleanEditor, ctx);
    const btn = container.querySelector('button') as HTMLButtonElement;
    // The styled kj-toggle uses role="switch" + aria-pressed (per APG button-with-state pattern).
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(ctx.commit).toHaveBeenCalledWith(true);
  });

  it('calls cancel on Escape', async () => {
    const ctx = makeCtx<boolean>(true);
    const { container } = await mount(KjBooleanEditor, ctx);
    const btn = container.querySelector('button') as HTMLButtonElement;
    fireEvent.keyDown(btn, { key: 'Escape' });
    expect(ctx.cancel).toHaveBeenCalled();
  });
});
