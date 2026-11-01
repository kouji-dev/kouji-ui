import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { provideKjToastListStrategy } from '@kouji-ui/core';
import { KjToastViewportComponent } from './toast';

const vp = (c: Element) => c.querySelector('.kj-toast-viewport')!;

describe('<kj-toast-viewport> kjToastExpand', () => {
  it('unset follows the strategy: the list strategy stays collapsed', async () => {
    const { container } = await render(`<kj-toast-viewport />`, {
      imports: [KjToastViewportComponent],
      providers: [provideKjToastListStrategy()],
    });
    expect(vp(container).getAttribute('data-expanded')).toBe('false');
  });

  it('a bare attribute expands the stack', async () => {
    const { container } = await render(`<kj-toast-viewport kjToastExpand />`, {
      imports: [KjToastViewportComponent],
      providers: [provideKjToastListStrategy()],
    });
    expect(vp(container).getAttribute('data-expanded')).toBe('true');
  });

  it('a binding forces either state', async () => {
    const { container, fixture } = await render(`<kj-toast-viewport [kjToastExpand]="open" />`, {
      imports: [KjToastViewportComponent],
      componentProperties: { open: true },
    });
    expect(vp(container).getAttribute('data-expanded')).toBe('true');
    (fixture.componentInstance as unknown as { open: boolean }).open = false;
    fixture.detectChanges();
    expect(vp(container).getAttribute('data-expanded')).toBe('false');
  });

  it('keeps the region landmark', async () => {
    const { container } = await render(`<kj-toast-viewport kjToastExpand />`, {
      imports: [KjToastViewportComponent],
    });
    expect(vp(container).getAttribute('role')).toBe('region');
  });
});
