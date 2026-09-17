import { render, fireEvent } from '@testing-library/angular';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjFocusRing } from './focus-ring';

expect.extend(toHaveNoViolations);

describe('KjFocusRing', () => {
  it('adds data-focus-visible on focus when last interaction was keyboard', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRing] },
    );
    const btn = container.querySelector('button')!;
    // No prior pointerdown — _lastWasPointer is false, so focus should be visible.
    fireEvent.focus(btn);
    expect(btn).toHaveAttribute('data-focus-visible', '');
  });

  it('does not add data-focus-visible on focus after pointer interaction', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRing] },
    );
    const btn = container.querySelector('button')!;
    // Simulate pointer interaction, then focus.
    fireEvent.pointerDown(document);
    fireEvent.focus(btn);
    expect(btn).not.toHaveAttribute('data-focus-visible');
  });

  it('removes data-focus-visible on blur', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRing] },
    );
    const btn = container.querySelector('button')!;
    fireEvent.focus(btn);
    fireEvent.blur(btn);
    expect(btn).not.toHaveAttribute('data-focus-visible');
  });

  it('restores data-focus-visible after keydown followed by focus', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRing] },
    );
    const btn = container.querySelector('button')!;
    // First simulate pointer (marks _lastWasPointer = true), then keyboard (resets it).
    fireEvent.pointerDown(document);
    fireEvent.keyDown(document);
    fireEvent.focus(btn);
    expect(btn).toHaveAttribute('data-focus-visible', '');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRing] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('installs ONE document listener pair for the whole page, not one per ring', async () => {
    const added = vi.spyOn(document, 'addEventListener');
    await render(
      `<button kjFocusRing>a</button>
       <button kjFocusRing>b</button>
       <button kjFocusRing>c</button>
       <button kjFocusRing>d</button>`,
      { imports: [KjFocusRing] },
    );
    const global = added.mock.calls.filter(
      ([type, , opts]) => (type === 'keydown' || type === 'pointerdown') && opts === true,
    );
    // Four rings used to mean eight capture listeners.
    expect(global).toHaveLength(2);
    added.mockRestore();
  });

  it('drops the shared listeners when the last ring is destroyed', async () => {
    const removed = vi.spyOn(document, 'removeEventListener');
    const { fixture } = await render(
      `<button kjFocusRing>a</button><button kjFocusRing>b</button>`,
      { imports: [KjFocusRing] },
    );
    fixture.destroy();
    const global = removed.mock.calls.filter(
      ([type, , opts]) => (type === 'keydown' || type === 'pointerdown') && opts === true,
    );
    expect(global).toHaveLength(2);
    removed.mockRestore();
  });

  it('keeps the ring while focused even though a pointer press lands elsewhere', async () => {
    const { container } = await render(
      `<button kjFocusRing>Click me</button>`,
      { imports: [KjFocusRing] },
    );
    const btn = container.querySelector('button')!;
    fireEvent.keyDown(document);
    fireEvent.focus(btn);
    expect(btn).toHaveAttribute('data-focus-visible', '');
    // The shared modality is page-global; reading it reactively would have
    // stripped the ring off an element that is still focused.
    fireEvent.pointerDown(document);
    expect(btn).toHaveAttribute('data-focus-visible', '');
  });
});
