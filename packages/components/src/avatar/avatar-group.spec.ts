import { Component } from '@angular/core';
import { render } from '@testing-library/angular';

import { KjAvatarComponent } from './avatar';
import { KjAvatarGroupComponent } from './avatar-group';

const imports = [KjAvatarComponent, KjAvatarGroupComponent];

/**
 * Allow Angular's signal-driven `effect()`s and `contentChildren` queries to
 * settle before the assertions read host attributes. Mirrors the helper used
 * by the core `KjAvatarGroup` spec.
 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

describe('KjAvatarGroupComponent', () => {
  it('renders projected <kj-avatar> children', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-avatar-group>
          <kj-avatar content="A" />
          <kj-avatar content="B" />
          <kj-avatar content="C" />
        </kj-avatar-group>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const groupEl = container.querySelector('kj-avatar-group') as HTMLElement;
    expect(groupEl).toBeTruthy();
    // The class binding mirrors the wrapper's host class.
    expect(groupEl.classList.contains('kj-avatar-group')).toBe(true);

    // Three projected avatars + (potentially) the chip. With default kjMax=4
    // and three children, the chip should NOT render.
    expect(groupEl.querySelectorAll('kj-avatar')).toHaveLength(3);
    expect(groupEl.querySelector('.kj-avatar-group-overflow')).toBeNull();
  });

  it('renders the overflow chip with "+N" when children exceed kjMax', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-avatar-group [kjMax]="2">
          <kj-avatar content="A" />
          <kj-avatar content="B" />
          <kj-avatar content="C" />
          <kj-avatar content="D" />
          <kj-avatar content="E" />
        </kj-avatar-group>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const chip = container.querySelector('.kj-avatar-group-overflow') as HTMLElement;
    expect(chip).toBeTruthy();
    // 5 projected children, kjMax=2 → overflow = 3.
    expect(chip.textContent?.trim()).toBe('+3');
  });

  it('overflow chip is aria-hidden so it does not duplicate the count-aware label', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-avatar-group [kjMax]="1">
          <kj-avatar content="A" />
          <kj-avatar content="B" />
          <kj-avatar content="C" />
        </kj-avatar-group>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const chip = container.querySelector('.kj-avatar-group-overflow') as HTMLElement;
    expect(chip).toBeTruthy();
    expect(chip.getAttribute('aria-hidden')).toBe('true');
  });

  it('forwards aliased inputs (kjMax, kjAriaLabel, kjTotal) to the underlying directive', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-avatar-group [kjMax]="3" kjAriaLabel="collaborators" [kjTotal]="42">
          <kj-avatar content="A" />
          <kj-avatar content="B" />
          <kj-avatar content="C" />
        </kj-avatar-group>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const groupEl = container.querySelector('kj-avatar-group') as HTMLElement;
    // Count-aware label proves kjAriaLabel + kjTotal reached the directive.
    expect(groupEl.getAttribute('aria-label')).toBe('3 of 42 collaborators');
    expect(groupEl.getAttribute('role')).toBe('group');

    // Chip with kjMax=3 and 3 projected (and kjTotal=42) → overflow = 39.
    const chip = container.querySelector('.kj-avatar-group-overflow') as HTMLElement;
    expect(chip).toBeTruthy();
    expect(chip.textContent?.trim()).toBe('+39');
  });

  it('renders nothing problematic when the group is empty', async () => {
    @Component({
      standalone: true,
      imports,
      template: `<kj-avatar-group [kjMax]="3"></kj-avatar-group>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const groupEl = container.querySelector('kj-avatar-group') as HTMLElement;
    expect(groupEl).toBeTruthy();
    // No chip when there is nothing to overflow.
    expect(container.querySelector('.kj-avatar-group-overflow')).toBeNull();
    // Empty group omits aria-label entirely (count-aware label suppressed at total === 0).
    expect(groupEl.hasAttribute('aria-label')).toBe(false);
  });
});
