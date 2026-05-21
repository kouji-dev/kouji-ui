import { Component, Type } from '@angular/core';
import { fireEvent, render } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';
import {
  KJ_EDITOR_CONTRACT,
  KjBooleanEditor,
  KjDateEditor,
  KjNumberEditor,
  KjSelectEditor,
  KjTextEditor,
  type KjEditorContract,
} from './index';

function makeCtx<T>(initial: T): KjEditorContract<T> & { commit: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> } {
  return {
    value: initial,
    commit: vi.fn(),
    cancel: vi.fn(),
  };
}

async function mount<T>(cmp: Type<T>, ctx: KjEditorContract<unknown>, host?: Type<unknown>) {
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
