import { Component, PLATFORM_ID, inject } from '@angular/core';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';

import { KjAvatar, KjAvatarFallback } from './avatar';
import { KjAvatarGroup } from './avatar-group';
import { KJ_AVATAR_GROUP } from './avatar-group.context';

expect.extend(toHaveNoViolations);

const imports = [KjAvatar, KjAvatarFallback, KjAvatarGroup];

/**
 * Allow Angular's signal-driven `effect()` to run after a query update —
 * tests need a microtask + a macrotask for content-children + writes to
 * settle before asserting on host attributes.
 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

function setHtmlDir(value: 'ltr' | 'rtl' | null): void {
  if (value === null) {
    document.documentElement.removeAttribute('dir');
  } else {
    document.documentElement.setAttribute('dir', value);
  }
}

describe('KjAvatarGroup', () => {
  afterEach(() => setHtmlDir(null));

  it('enumerates projected children', async () => {
    const { container } = await render(
      `<span kjAvatarGroup>
         <span kjAvatar>A</span>
         <span kjAvatar>B</span>
         <span kjAvatar>C</span>
       </span>`,
      { imports },
    );
    await flush();

    expect(container.querySelectorAll('[kjAvatar]')).toHaveLength(3);
  });

  it('hides children past kjMax via [hidden] and data-overflow', async () => {
    const { container } = await render(
      `<span kjAvatarGroup [kjMax]="2">
         <span kjAvatar id="a">A</span>
         <span kjAvatar id="b">B</span>
         <span kjAvatar id="c">C</span>
         <span kjAvatar id="d">D</span>
       </span>`,
      { imports },
    );
    await flush();

    const a = container.querySelector('#a') as HTMLElement;
    const b = container.querySelector('#b') as HTMLElement;
    const c = container.querySelector('#c') as HTMLElement;
    const d = container.querySelector('#d') as HTMLElement;

    expect(a.hasAttribute('hidden')).toBe(false);
    expect(b.hasAttribute('hidden')).toBe(false);
    expect(c.hasAttribute('hidden')).toBe(true);
    expect(c.getAttribute('data-overflow')).toBe('true');
    expect(d.hasAttribute('hidden')).toBe(true);
    expect(d.getAttribute('data-overflow')).toBe('true');
  });

  it('exposes visible / overflow / total signals correctly', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <span kjAvatarGroup [kjMax]="2">
          @for (i of items; track i) {
            <span kjAvatar></span>
          }
        </span>`,
    })
    class Host {
      items = [1, 2, 3, 4, 5];
    }

    const { fixture } = await render(Host);
    await flush();

    const el = fixture.nativeElement.querySelector(
      '[kjAvatarGroup]',
    ) as HTMLElement;
    expect(el).toBeTruthy();

    // Visible count = min(5, 2) = 2; overflow = 5 - 2 = 3; total = 5.
    // Verify via the count-aware aria-label and CSS variable as public surfaces.
    expect(el.getAttribute('aria-label')).toBe('2 of 5 avatars');
    expect(el.getAttribute('role')).toBe('group');
    expect(el.style.getPropertyValue('--kj-avatar-group-count')).toBe('2');
  });

  it('default count-aware aria-label uses "avatars"', async () => {
    const { container } = await render(
      `<span kjAvatarGroup [kjMax]="3">
         <span kjAvatar></span>
         <span kjAvatar></span>
         <span kjAvatar></span>
         <span kjAvatar></span>
         <span kjAvatar></span>
       </span>`,
      { imports },
    );
    await flush();

    const el = container.querySelector('[kjAvatarGroup]') as HTMLElement;
    expect(el.getAttribute('aria-label')).toBe('3 of 5 avatars');
  });

  it('aria-label uses kjAriaLabel noun and kjTotal override', async () => {
    const { container } = await render(
      `<span kjAvatarGroup [kjMax]="3" kjAriaLabel="collaborators" [kjTotal]="42">
         <span kjAvatar></span>
         <span kjAvatar></span>
         <span kjAvatar></span>
       </span>`,
      { imports },
    );
    await flush();

    const el = container.querySelector('[kjAvatarGroup]') as HTMLElement;
    expect(el.getAttribute('aria-label')).toBe('3 of 42 collaborators');
  });

  it('clamps kjTotal upward when smaller than projected child count', async () => {
    const { container } = await render(
      `<span kjAvatarGroup [kjMax]="2" [kjTotal]="1">
         <span kjAvatar></span>
         <span kjAvatar></span>
         <span kjAvatar></span>
       </span>`,
      { imports },
    );
    await flush();

    const el = container.querySelector('[kjAvatarGroup]') as HTMLElement;
    // Clamped to 3 (the projected count); never reads "2 of 1".
    expect(el.getAttribute('aria-label')).toBe('2 of 3 avatars');
  });

  it('omits aria-label entirely when total === 0', async () => {
    const { container } = await render(
      `<span kjAvatarGroup [kjMax]="3"></span>`,
      { imports },
    );
    await flush();

    const el = container.querySelector('[kjAvatarGroup]') as HTMLElement;
    expect(el.hasAttribute('aria-label')).toBe(false);
  });

  it('aria-label override (kjAriaLabelOverride) wins over count-aware default', async () => {
    const { container } = await render(
      `<span kjAvatarGroup [kjMax]="2" kjAriaLabelOverride="Project team">
         <span kjAvatar></span>
         <span kjAvatar></span>
         <span kjAvatar></span>
       </span>`,
      { imports },
    );
    await flush();

    const el = container.querySelector('[kjAvatarGroup]') as HTMLElement;
    expect(el.getAttribute('aria-label')).toBe('Project team');
  });

  it('honours custom kjAriaLabelFormat for i18n', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <span kjAvatarGroup [kjMax]="2" [kjAriaLabelFormat]="format">
          <span kjAvatar></span>
          <span kjAvatar></span>
          <span kjAvatar></span>
          <span kjAvatar></span>
        </span>`,
    })
    class Host {
      format = (v: number, t: number, l: string) =>
        `${v}/${t} ${l} (FR)`;
    }

    const { fixture } = await render(Host);
    await flush();

    const el = fixture.nativeElement.querySelector(
      '[kjAvatarGroup]',
    ) as HTMLElement;
    expect(el.getAttribute('aria-label')).toBe('2/4 avatars (FR)');
  });

  it('size and shape propagate via KJ_AVATAR_GROUP context', async () => {
    @Component({
      selector: 'kj-test-child',
      standalone: true,
      template: `<span data-test-child [attr.data-size]="ctx?.size()" [attr.data-shape]="ctx?.shape()"></span>`,
    })
    class Child {
      readonly ctx = inject(KJ_AVATAR_GROUP, { optional: true });
    }

    @Component({
      standalone: true,
      imports: [...imports, Child],
      template: `
        <span kjAvatarGroup kjSize="lg" kjShape="rounded">
          <span kjAvatar><kj-test-child /></span>
          <span kjAvatar><kj-test-child /></span>
        </span>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const probes = container.querySelectorAll('[data-test-child]');
    expect(probes.length).toBe(2);
    probes.forEach((p) => {
      expect(p.getAttribute('data-size')).toBe('lg');
      expect(p.getAttribute('data-shape')).toBe('rounded');
    });
  });

  it('kjRole controls host role (group / list)', async () => {
    const { container } = await render(
      `<span kjAvatarGroup kjRole="list">
         <span kjAvatar></span>
         <span kjAvatar></span>
       </span>`,
      { imports },
    );
    await flush();

    const el = container.querySelector('[kjAvatarGroup]') as HTMLElement;
    expect(el.getAttribute('role')).toBe('list');
  });

  it('kjRole=null opts out of the host role attribute', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <span kjAvatarGroup [kjRole]="null">
          <span kjAvatar></span>
        </span>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const el = container.querySelector('[kjAvatarGroup]') as HTMLElement;
    expect(el.hasAttribute('role')).toBe(false);
  });

  it('LTR stacking writes per-child --kj-avatar-group-stack-order with first child on top', async () => {
    setHtmlDir('ltr');

    const { container } = await render(
      `<span kjAvatarGroup [kjMax]="0">
         <span kjAvatar id="a"></span>
         <span kjAvatar id="b"></span>
         <span kjAvatar id="c"></span>
       </span>`,
      { imports },
    );
    await flush();

    const a = container.querySelector('#a') as HTMLElement;
    const b = container.querySelector('#b') as HTMLElement;
    const c = container.querySelector('#c') as HTMLElement;

    // First child highest stack-order in LTR.
    expect(a.style.getPropertyValue('--kj-avatar-group-stack-order')).toBe('2');
    expect(b.style.getPropertyValue('--kj-avatar-group-stack-order')).toBe('1');
    expect(c.style.getPropertyValue('--kj-avatar-group-stack-order')).toBe('0');

    const groupEl = container.querySelector('[kjAvatarGroup]') as HTMLElement;
    expect(groupEl.getAttribute('data-direction')).toBe('ltr');
  });

  it('RTL stacking flips so the last DOM child paints on top', async () => {
    setHtmlDir('rtl');

    const { container } = await render(
      `<span kjAvatarGroup [kjMax]="0">
         <span kjAvatar id="a"></span>
         <span kjAvatar id="b"></span>
         <span kjAvatar id="c"></span>
       </span>`,
      { imports },
    );
    await flush();
    // Direction signal updates after afterNextRender; allow another tick.
    await flush();

    const a = container.querySelector('#a') as HTMLElement;
    const c = container.querySelector('#c') as HTMLElement;

    const groupEl = container.querySelector('[kjAvatarGroup]') as HTMLElement;
    expect(groupEl.getAttribute('data-direction')).toBe('rtl');

    // In RTL the visually-leading face (last DOM child) should paint on
    // top — so its stack-order is the highest, while the first DOM child
    // is now visually trailing and paints behind.
    expect(c.style.getPropertyValue('--kj-avatar-group-stack-order')).toBe('2');
    expect(a.style.getPropertyValue('--kj-avatar-group-stack-order')).toBe('0');
  });

  it('SSR safe — no DOM mutations when PLATFORM_ID is "server"', async () => {
    const { container } = await render(
      `<span kjAvatarGroup [kjMax]="1">
         <span kjAvatar id="a"></span>
         <span kjAvatar id="b"></span>
         <span kjAvatar id="c"></span>
       </span>`,
      {
        imports,
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      },
    );
    await flush();

    // On the server we must not write [hidden] or stack-order CSS variables;
    // those belong to the hydration step.
    const b = container.querySelector('#b') as HTMLElement;
    const c = container.querySelector('#c') as HTMLElement;
    expect(b.hasAttribute('hidden')).toBe(false);
    expect(c.hasAttribute('hidden')).toBe(false);
    expect(b.style.getPropertyValue('--kj-avatar-group-stack-order')).toBe('');
  });

  it('passes axe accessibility audit (default group)', async () => {
    const { container } = await render(
      `<span kjAvatarGroup kjAriaLabel="collaborators" [kjMax]="2">
         <span kjAvatar><span kjAvatarFallback aria-hidden="true">JD</span></span>
         <span kjAvatar><span kjAvatarFallback aria-hidden="true">AB</span></span>
         <span kjAvatar><span kjAvatarFallback aria-hidden="true">CD</span></span>
       </span>`,
      { imports },
    );
    await flush();

    expect(await axe(container)).toHaveNoViolations();
  });
});
