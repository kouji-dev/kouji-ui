import { Component, inject } from '@angular/core';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import { KjButton } from '../button/button';
import { KjButtonGroup } from './button-group';
import { KJ_BUTTON_GROUP } from './button-group.context';

expect.extend(toHaveNoViolations);

describe('KjButtonGroup', () => {
  it('renders with role="group"', async () => {
    const { container } = await render(
      `<div kjButtonGroup>
         <button kjButton>One</button>
         <button kjButton>Two</button>
       </div>`,
      { imports: [KjButtonGroup, KjButton] },
    );
    const host = container.querySelector('[kjButtonGroup]') as HTMLElement;
    expect(host.getAttribute('role')).toBe('group');
  });

  it('defaults to horizontal orientation', async () => {
    const { container } = await render(
      `<div kjButtonGroup><button kjButton>x</button></div>`,
      { imports: [KjButtonGroup, KjButton] },
    );
    const host = container.querySelector('[kjButtonGroup]') as HTMLElement;
    expect(host.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('reflects kjOrientation="vertical" to data-orientation', async () => {
    const { container } = await render(
      `<div kjButtonGroup [kjOrientation]="'vertical'"><button kjButton>x</button></div>`,
      { imports: [KjButtonGroup, KjButton] },
    );
    const host = container.querySelector('[kjButtonGroup]') as HTMLElement;
    expect(host.getAttribute('data-orientation')).toBe('vertical');
  });

  it('writes data-disabled when kjDisabled is true', async () => {
    const { container } = await render(
      `<div kjButtonGroup [kjDisabled]="true"><button kjButton>x</button></div>`,
      { imports: [KjButtonGroup, KjButton] },
    );
    const host = container.querySelector('[kjButtonGroup]') as HTMLElement;
    expect(host.getAttribute('data-disabled')).toBe('');
  });

  it('omits data-disabled when kjDisabled is false', async () => {
    const { container } = await render(
      `<div kjButtonGroup><button kjButton>x</button></div>`,
      { imports: [KjButtonGroup, KjButton] },
    );
    const host = container.querySelector('[kjButtonGroup]') as HTMLElement;
    expect(host.hasAttribute('data-disabled')).toBe(false);
  });

  it('provides KJ_BUTTON_GROUP context with variant and size signals', async () => {
    let captured: ReturnType<typeof inject<typeof KJ_BUTTON_GROUP>> | undefined;

    @Component({
      selector: 'kj-bg-probe',
      standalone: true,
      template: '',
    })
    class Probe {
      constructor() {
        captured = inject(KJ_BUTTON_GROUP);
      }
    }

    await render(
      `<div kjButtonGroup [kjVariant]="'outline'" [kjSize]="'sm'">
         <kj-bg-probe />
       </div>`,
      { imports: [KjButtonGroup, Probe] },
    );

    expect(captured).toBeDefined();
    expect(captured!.variant()).toBe('outline');
    expect(captured!.size()).toBe('sm');
    expect(captured!.orientation()).toBe('horizontal');
    expect(captured!.disabled()).toBe(false);
  });

  it('passes axe audit', async () => {
    const { container } = await render(
      `<div kjButtonGroup>
         <button kjButton>Save</button>
         <button kjButton>Cancel</button>
       </div>`,
      { imports: [KjButtonGroup, KjButton] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
