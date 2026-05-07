import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';

import { KjProgressBarComponent } from './progress-bar';

const imports = [KjProgressBarComponent];

/**
 * Flush microtasks + the rAF backing `afterNextRender` so the directive has
 * a chance to subscribe to the reduced-motion signal and write its host
 * attributes before assertions read them.
 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

/** The wrapper's `<kj-progress-bar>` host renders `display: contents` and
 *  delegates ARIA + value math to an inner `<div kjProgressBar>`. The inner
 *  div is what carries `role`, the value attributes, and the data-*
 *  reflections — that's the assertion target. */
function getBar(container: ParentNode): HTMLElement {
  const bar = container.querySelector('div.kj-progress-bar') as HTMLElement;
  if (!bar) throw new Error('kj-progress-bar inner element not found');
  return bar;
}

describe('KjProgressBarComponent', () => {
  it('renders the wrapper with an inner [kjProgressBar] and a [kjProgressBarFill]', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-progress-bar [kjValue]="50" kjAriaLabel="x" />`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const wrapper = container.querySelector('kj-progress-bar') as HTMLElement;
    expect(wrapper).toBeTruthy();

    const bar = getBar(container);
    expect(bar.getAttribute('role')).toBe('progressbar');

    // Wrapper is responsible for rendering the inner fill so consumers
    // don't have to remember the two-element shape.
    const fill = bar.querySelector('.kj-progress-bar__fill') as HTMLElement;
    expect(fill).toBeTruthy();
    // Fill is the [kjProgressBarFill] directive host — it reflects the
    // parent fraction as --kj-progress-fraction (proves wiring is intact).
    expect(fill.style.getPropertyValue('--kj-progress-fraction')).toBe('0.5');
  });

  it('forwards kjValue: aliased input drives aria-valuenow when determinate', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-progress-bar [kjValue]="42" kjAriaLabel="Upload" />`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const bar = getBar(container);
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('omits aria-valuenow when kjValue is null (indeterminate)', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-progress-bar [kjValue]="null" kjAriaLabel="Loading" />`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const bar = getBar(container);
    // APG-correct: indeterminate must NOT carry aria-valuenow at all.
    expect(bar.hasAttribute('aria-valuenow')).toBe(false);
    expect(bar.getAttribute('data-indeterminate')).toBe('true');

    // Bounds attributes are still present in indeterminate mode.
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('forwards kjMin / kjMax for absolute units', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-progress-bar
          [kjMin]="0"
          [kjMax]="2500000"
          [kjValue]="1200000"
          kjAriaLabel="bytes"
        />
      `,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const bar = getBar(container);
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('2500000');
    expect(bar.getAttribute('aria-valuenow')).toBe('1200000');
  });

  it('forwards kjAriaValuetext to the host', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-progress-bar [kjValue]="60" kjAriaValuetext="Step 3 of 5" kjAriaLabel="Onboarding" />`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const bar = getBar(container);
    expect(bar.getAttribute('aria-valuetext')).toBe('Step 3 of 5');
    // Visual fraction is still 60% even though SR reads the phrasing.
    expect(bar.getAttribute('aria-valuenow')).toBe('60');
  });

  it('forwards kjVariant and kjSize through the composed directives', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-progress-bar [kjValue]="50" kjVariant="success" kjSize="lg" kjAriaLabel="x" />`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const bar = getBar(container);
    expect(bar.getAttribute('data-variant')).toBe('success');
    expect(bar.getAttribute('data-size')).toBe('lg');
  });

  it('reflects defaults when no variant/size provided (primary, md)', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-progress-bar [kjValue]="50" kjAriaLabel="x" />`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const bar = getBar(container);
    expect(bar.getAttribute('data-variant')).toBe('primary');
    expect(bar.getAttribute('data-size')).toBe('md');
  });

  it('binds kjAriaLabel to the bar', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-progress-bar [kjValue]="50" kjAriaLabel="Upload progress" />`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const bar = getBar(container);
    expect(bar.getAttribute('aria-label')).toBe('Upload progress');
  });

  it('binds kjAriaLabelledby to the bar', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <span id="upload-heading">Upload</span>
        <kj-progress-bar [kjValue]="50" kjAriaLabelledby="upload-heading" />
      `,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const bar = getBar(container);
    expect(bar.getAttribute('aria-labelledby')).toBe('upload-heading');
  });

  it('switches between determinate and indeterminate reactively', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-progress-bar [kjValue]="value()" kjAriaLabel="x" />`,
    })
    class Host {
      readonly value = signal<number | null>(30);
    }

    const { fixture } = await render(Host);
    await flush();

    const bar = getBar(fixture.nativeElement);
    expect(bar.getAttribute('aria-valuenow')).toBe('30');
    expect(bar.hasAttribute('data-indeterminate')).toBe(false);

    fixture.componentInstance.value.set(null);
    fixture.detectChanges();
    await flush();

    expect(bar.hasAttribute('aria-valuenow')).toBe(false);
    expect(bar.getAttribute('data-indeterminate')).toBe('true');

    fixture.componentInstance.value.set(80);
    fixture.detectChanges();
    await flush();

    expect(bar.getAttribute('aria-valuenow')).toBe('80');
    expect(bar.hasAttribute('data-indeterminate')).toBe(false);
  });
});
