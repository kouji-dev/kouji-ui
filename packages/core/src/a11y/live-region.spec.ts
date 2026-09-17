import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, vi } from 'vitest';
import { KjLiveRegion } from './live-region';

expect.extend(toHaveNoViolations);

describe('KjLiveRegion', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets aria-live to polite by default', async () => {
    const { container } = await render(
      `<div kjLiveRegion></div>`,
      { imports: [KjLiveRegion] },
    );
    expect(container.querySelector('div')).toHaveAttribute('aria-live', 'polite');
  });

  it('sets aria-live to assertive when specified', async () => {
    const { container } = await render(
      `<div kjLiveRegion [kjPoliteness]="'assertive'"></div>`,
      { imports: [KjLiveRegion] },
    );
    expect(container.querySelector('div')).toHaveAttribute('aria-live', 'assertive');
  });

  it('sets aria-atomic to true', async () => {
    const { container } = await render(
      `<div kjLiveRegion></div>`,
      { imports: [KjLiveRegion] },
    );
    expect(container.querySelector('div')).toHaveAttribute('aria-atomic', 'true');
  });

  it('announce() writes the message into the host after a brief timeout', async () => {
    const { fixture } = await render(
      `<div kjLiveRegion #r="kjLiveRegion"></div>`,
      { imports: [KjLiveRegion] },
    );
    const div = fixture.nativeElement.querySelector('div') as HTMLElement;
    const region = fixture.debugElement.query((d) => d.name === 'div').injector.get(KjLiveRegion);
    vi.useFakeTimers();
    region.announce('Item saved');
    expect(div.textContent).toBe('');
    vi.advanceTimersByTime(50);
    expect(div.textContent).toBe('Item saved');
  });

  it('announce() keeps the host\'s own children (writes only its owned text node)', async () => {
    const { fixture } = await render(
      `<div kjLiveRegion #r="kjLiveRegion"><input id="cell" /><span id="label">Code</span></div>`,
      { imports: [KjLiveRegion] },
    );
    const div = fixture.nativeElement.querySelector('div') as HTMLElement;
    const region = fixture.debugElement.query((d) => d.name === 'div').injector.get(KjLiveRegion);
    vi.useFakeTimers();
    region.announce('Code complete', 100);
    vi.advanceTimersByTime(50);
    expect(div.querySelector('#cell')).not.toBeNull();
    expect(div.querySelector('#label')).not.toBeNull();
    expect(div.textContent).toBe('CodeCode complete');
    vi.advanceTimersByTime(100);
    expect(div.textContent).toBe('Code');
    expect(div.querySelector('#cell')).not.toBeNull();
  });

  it('a second announce() supersedes a pending one', async () => {
    const { fixture } = await render(
      `<div kjLiveRegion #r="kjLiveRegion"></div>`,
      { imports: [KjLiveRegion] },
    );
    const div = fixture.nativeElement.querySelector('div') as HTMLElement;
    const region = fixture.debugElement.query((d) => d.name === 'div').injector.get(KjLiveRegion);
    vi.useFakeTimers();
    region.announce('first');
    vi.advanceTimersByTime(20);
    region.announce('second');
    vi.advanceTimersByTime(50);
    expect(div.textContent).toBe('second');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<div kjLiveRegion></div>`,
      { imports: [KjLiveRegion] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
