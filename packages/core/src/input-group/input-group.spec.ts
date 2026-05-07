import { Component, inject } from '@angular/core';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { KjInputGroupAddon } from './input-group-addon';
import { KjInputGroup } from './input-group';
import { KJ_INPUT_GROUP } from './input-group.context';

expect.extend(toHaveNoViolations);

describe('KjInputGroup', () => {
  it('renders without error', async () => {
    const { container } = await render(
      `<div kjInputGroup>
         <span kjInputGroupAddon>$</span>
       </div>`,
      { imports: [KjInputGroup, KjInputGroupAddon] },
    );
    expect(container.querySelector('[kjInputGroup]')).toBeInTheDocument();
  });

  it('defaults to horizontal orientation', async () => {
    const { container } = await render(
      `<div kjInputGroup><span kjInputGroupAddon>$</span></div>`,
      { imports: [KjInputGroup, KjInputGroupAddon] },
    );
    const host = container.querySelector('[kjInputGroup]') as HTMLElement;
    expect(host.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('reflects kjOrientation="vertical" to data-orientation', async () => {
    const { container } = await render(
      `<div kjInputGroup [kjOrientation]="'vertical'"><span kjInputGroupAddon>$</span></div>`,
      { imports: [KjInputGroup, KjInputGroupAddon] },
    );
    const host = container.querySelector('[kjInputGroup]') as HTMLElement;
    expect(host.getAttribute('data-orientation')).toBe('vertical');
  });

  it('sets data-disabled when kjDisabled is true', async () => {
    const { container } = await render(
      `<div kjInputGroup [kjDisabled]="true"><span kjInputGroupAddon>$</span></div>`,
      { imports: [KjInputGroup, KjInputGroupAddon] },
    );
    const host = container.querySelector('[kjInputGroup]') as HTMLElement;
    expect(host.getAttribute('data-disabled')).toBe('');
  });

  it('omits data-disabled when kjDisabled is false', async () => {
    const { container } = await render(
      `<div kjInputGroup><span kjInputGroupAddon>$</span></div>`,
      { imports: [KjInputGroup, KjInputGroupAddon] },
    );
    const host = container.querySelector('[kjInputGroup]') as HTMLElement;
    expect(host.hasAttribute('data-disabled')).toBe(false);
  });

  it('provides KJ_INPUT_GROUP context', async () => {
    let captured: ReturnType<typeof inject<typeof KJ_INPUT_GROUP>> | undefined;

    @Component({
      selector: 'kj-ig-probe',
      standalone: true,
      template: '',
    })
    class Probe {
      constructor() {
        captured = inject(KJ_INPUT_GROUP);
      }
    }

    await render(
      `<div kjInputGroup [kjDisabled]="false">
         <kj-ig-probe />
       </div>`,
      { imports: [KjInputGroup, Probe] },
    );

    expect(captured).toBeDefined();
    expect(captured!.grouped).toBe(true);
    expect(captured!.disabled()).toBe(false);
  });

  it('addons register with the group and expose an id', async () => {
    let captured: ReturnType<typeof inject<typeof KJ_INPUT_GROUP>> | undefined;

    @Component({
      selector: 'kj-ig-ctx-probe',
      standalone: true,
      template: '',
    })
    class CtxProbe {
      constructor() {
        captured = inject(KJ_INPUT_GROUP);
      }
    }

    await render(
      `<div kjInputGroup>
         <span kjInputGroupAddon>$</span>
         <kj-ig-ctx-probe />
         <span kjInputGroupAddon kjPosition="end">.00</span>
       </div>`,
      { imports: [KjInputGroup, KjInputGroupAddon, CtxProbe] },
    );

    // After both addons register, there should be entries in start / end ids.
    expect(captured).toBeDefined();
    // Non-decorative addons appear in either startAddonIds or endAddonIds.
    const allIds = [...captured!.startAddonIds(), ...captured!.endAddonIds()];
    expect(allIds.length).toBeGreaterThanOrEqual(1);
  });

  it('addon with kjAriaHidden="true" is excluded from id lists', async () => {
    let captured: ReturnType<typeof inject<typeof KJ_INPUT_GROUP>> | undefined;

    @Component({
      selector: 'kj-ig-hidden-probe',
      standalone: true,
      template: '',
    })
    class HiddenProbe {
      constructor() {
        captured = inject(KJ_INPUT_GROUP);
      }
    }

    await render(
      `<div kjInputGroup>
         <span kjInputGroupAddon [kjAriaHidden]="true">icon</span>
         <kj-ig-hidden-probe />
       </div>`,
      { imports: [KjInputGroup, KjInputGroupAddon, HiddenProbe] },
    );

    expect(captured).toBeDefined();
    const allIds = [...captured!.startAddonIds(), ...captured!.endAddonIds()];
    expect(allIds.length).toBe(0);
  });

  it('addon reflects kjPosition to data-position attribute', async () => {
    const { container } = await render(
      `<div kjInputGroup>
         <span kjInputGroupAddon kjPosition="end">.00</span>
       </div>`,
      { imports: [KjInputGroup, KjInputGroupAddon] },
    );
    const addon = container.querySelector('[kjInputGroupAddon]') as HTMLElement;
    expect(addon.getAttribute('data-position')).toBe('end');
  });

  it('addon sets aria-hidden="true" when kjAriaHidden is true', async () => {
    const { container } = await render(
      `<div kjInputGroup>
         <span kjInputGroupAddon [kjAriaHidden]="true">icon</span>
       </div>`,
      { imports: [KjInputGroup, KjInputGroupAddon] },
    );
    const addon = container.querySelector('[kjInputGroupAddon]') as HTMLElement;
    expect(addon.getAttribute('aria-hidden')).toBe('true');
  });

  it('addon does not set aria-hidden when kjAriaHidden is undefined', async () => {
    const { container } = await render(
      `<div kjInputGroup>
         <span kjInputGroupAddon>$</span>
       </div>`,
      { imports: [KjInputGroup, KjInputGroupAddon] },
    );
    const addon = container.querySelector('[kjInputGroupAddon]') as HTMLElement;
    expect(addon.hasAttribute('aria-hidden')).toBe(false);
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<div kjInputGroup aria-label="Amount">
         <span kjInputGroupAddon aria-hidden="true">$</span>
         <input type="text" aria-label="Amount" placeholder="Amount" />
         <span kjInputGroupAddon aria-hidden="true">.00</span>
       </div>`,
      { imports: [KjInputGroup, KjInputGroupAddon] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
