import { Component } from '@angular/core';
import { render } from '@testing-library/angular';

import { KjListComponent, KjListItemComponent } from './list';

const imports = [KjListComponent, KjListItemComponent];

/**
 * Allow Angular's signal-driven host bindings and `effect()`s to settle
 * before the assertions read host attributes. Mirrors the helper used by the
 * sibling `<kj-avatar-group>` spec.
 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

describe('KjListComponent', () => {
  it('renders projected <kj-list-item> children with the wrapper class', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-list ariaLabel="Recent files">
          <kj-list-item>One</kj-list-item>
          <kj-list-item>Two</kj-list-item>
          <kj-list-item>Three</kj-list-item>
        </kj-list>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const listEl = container.querySelector('kj-list') as HTMLElement;
    expect(listEl).toBeTruthy();
    expect(listEl.classList.contains('kj-list')).toBe(true);

    const items = container.querySelectorAll('kj-list-item');
    expect(items).toHaveLength(3);
    items.forEach((item) => {
      expect((item as HTMLElement).classList.contains('kj-list-item')).toBe(true);
    });
  });

  it('forwards aliased inputs (orientation, divided, hoverable) to the underlying directive', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-list ariaLabel="Story rail" orientation="horizontal" [divided]="true" [hoverable]="true">
          <kj-list-item>A</kj-list-item>
          <kj-list-item>B</kj-list-item>
        </kj-list>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const listEl = container.querySelector('kj-list') as HTMLElement;
    // The directive emits the data-* mirrors that themes read for chrome.
    expect(listEl.getAttribute('data-orientation')).toBe('horizontal');
    expect(listEl.hasAttribute('data-divided')).toBe(true);
    expect(listEl.hasAttribute('data-hoverable')).toBe(true);
    // Default `as="ul"` → directive emits role="list" (defeats Safari's
    // `list-style: none` voice-stripping heuristic).
    expect(listEl.getAttribute('role')).toBe('list');
    expect(listEl.getAttribute('aria-label')).toBe('Story rail');
  });

  it('forwards aliased item inputs (active, disabled) to the per-row directive', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-list ariaLabel="L">
          <kj-list-item [active]="true">A</kj-list-item>
          <kj-list-item [disabled]="true">B</kj-list-item>
        </kj-list>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const items = container.querySelectorAll('kj-list-item');
    expect(items[0].hasAttribute('data-active')).toBe(true);
    expect(items[0].hasAttribute('data-disabled')).toBe(false);
    expect(items[1].hasAttribute('data-active')).toBe(false);
    expect(items[1].hasAttribute('data-disabled')).toBe(true);
    // The list-item host is a `<kj-list-item>` (not `<li>`) — the directive
    // must emit role="listitem" to pair with the container's role="list".
    expect(items[0].getAttribute('role')).toBe('listitem');
    expect(items[1].getAttribute('role')).toBe('listitem');
  });

  it('produces a navigation landmark when as="nav"', async () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <kj-list as="nav" ariaLabel="Primary">
          <kj-list-item><a href="#a">A</a></kj-list-item>
          <kj-list-item><a href="#b">B</a></kj-list-item>
        </kj-list>`,
    })
    class Host {}

    const { container } = await render(Host);
    await flush();

    const listEl = container.querySelector('kj-list') as HTMLElement;
    // The wrapper layers `role="navigation"` on the host so the list doubles
    // as a landmark; the underlying directive omits its `role="list"` in this
    // mode (a landmark cannot also be a list).
    expect(listEl.getAttribute('role')).toBe('navigation');
    expect(listEl.getAttribute('aria-label')).toBe('Primary');
  });
});
