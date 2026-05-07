import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { KjIconDirective } from './icon.directive';
import { provideIcons, provideIconLoader } from './icon.providers';

expect.extend(toHaveNoViolations);

describe('KjIconDirective — svg mode (decorative default)', () => {
  it('writes --kj-icon and data-kj-icon-mode="svg"', async () => {
    const { container } = await render(`<span [kjIcon]="'settings'"></span>`, {
      imports: [KjIconDirective],
      providers: [provideIcons({ settings: 'url("a")' })],
    });
    const host = container.querySelector('span')!;
    expect(host.getAttribute('data-kj-icon-mode')).toBe('svg');
    expect(host.style.getPropertyValue('--kj-icon')).toBe('url("a")');
  });

  it('applies the .kj-icon class', async () => {
    const { container } = await render(`<span [kjIcon]="'settings'"></span>`, {
      imports: [KjIconDirective],
      providers: [provideIcons({ settings: 'url("a")' })],
    });
    expect(container.querySelector('span')!.classList.contains('kj-icon')).toBe(true);
  });

  it('default = decorative: aria-hidden="true", no role, no aria-label', async () => {
    const { container } = await render(`<span [kjIcon]="'settings'"></span>`, {
      imports: [KjIconDirective],
      providers: [provideIcons({ settings: 'url("a")' })],
    });
    const host = container.querySelector('span')!;
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.hasAttribute('role')).toBe(false);
    expect(host.hasAttribute('aria-label')).toBe(false);
  });
});

describe('KjIconDirective — meaningful mode (kjIconLabel)', () => {
  it('removes aria-hidden, sets role="img" and aria-label', async () => {
    const { container } = await render(
      `<span [kjIcon]="'alert'" [kjIconLabel]="'Warning'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIcons({ alert: 'url("a")' })],
      },
    );
    const host = container.querySelector('span')!;
    expect(host.hasAttribute('aria-hidden')).toBe(false);
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Warning');
  });
});

describe('KjIconDirective — color tokens', () => {
  it('inherits color by default (no inline color style)', async () => {
    const { container } = await render(`<span [kjIcon]="'x'"></span>`, {
      imports: [KjIconDirective],
      providers: [provideIcons({ x: 'url("a")' })],
    });
    expect(container.querySelector('span')!.getAttribute('style') ?? '').not.toContain('color:');
  });

  it('writes color: var(--kj-color-icon-{token}) for non-inherit', async () => {
    const { container } = await render(
      `<span [kjIcon]="'x'" [kjIconColor]="'danger'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIcons({ x: 'url("a")' })],
      },
    );
    const styleAttr = container.querySelector('span')!.getAttribute('style') ?? '';
    expect(styleAttr).toContain('color: var(--kj-color-icon-danger)');
  });

  it('"inherit" color writes no inline color', async () => {
    const { container } = await render(
      `<span [kjIcon]="'x'" [kjIconColor]="'inherit'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIcons({ x: 'url("a")' })],
      },
    );
    expect(container.querySelector('span')!.getAttribute('style') ?? '').not.toContain('color:');
  });
});

describe('KjIconDirective — size tokens', () => {
  it('writes font-size: var(--kj-icon-size-{token})', async () => {
    const { container } = await render(
      `<span [kjIcon]="'x'" [kjIconSize]="'lg'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIcons({ x: 'url("a")' })],
      },
    );
    const styleAttr = container.querySelector('span')!.getAttribute('style') ?? '';
    expect(styleAttr).toContain('font-size: var(--kj-icon-size-lg)');
  });
});

describe('KjIconDirective — font mode', () => {
  it('reflects data-kj-icon-mode="font" for @font.* names', async () => {
    const { container } = await render(
      `<span [kjIcon]="'@font.fa-cog'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIcons({ '@font.fa-cog': '"\\f013"' })],
      },
    );
    const host = container.querySelector('span')!;
    expect(host.getAttribute('data-kj-icon-mode')).toBe('font');
    expect(host.style.getPropertyValue('--kj-icon')).toBe('"\\f013"');
  });
});

describe('KjIconDirective — loader pending', () => {
  it('renders no --kj-icon value while async load is pending', async () => {
    const neverResolves = () =>
      new Promise<string>(() => {/* hangs forever */});
    const { container } = await render(`<span [kjIcon]="'missing'"></span>`, {
      imports: [KjIconDirective],
      providers: [provideIconLoader(neverResolves)],
    });
    const host = container.querySelector('span')!;
    expect(host.style.getPropertyValue('--kj-icon')).toBe('');
  });

  it('updates --kj-icon once loader resolves', async () => {
    let resolveLoad!: (v: string) => void;
    const loader = (n: string) =>
      new Promise<string>((res) => {
        resolveLoad = res;
      });
    const { container, fixture } = await render(
      `<span [kjIcon]="'settings'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIconLoader(loader)],
      },
    );
    const host = container.querySelector('span')!;
    expect(host.style.getPropertyValue('--kj-icon')).toBe('');

    resolveLoad('url("loaded")');
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(host.style.getPropertyValue('--kj-icon')).toBe('url("loaded")');
  });
});

describe('KjIconDirective — a11y audits', () => {
  it('decorative icon passes axe', async () => {
    const { container } = await render(`<span [kjIcon]="'settings'"></span>`, {
      imports: [KjIconDirective],
      providers: [provideIcons({ settings: 'url("a")' })],
    });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('meaningful icon passes axe', async () => {
    const { container } = await render(
      `<span [kjIcon]="'alert'" [kjIconLabel]="'Warning'"></span>`,
      {
        imports: [KjIconDirective],
        providers: [provideIcons({ alert: 'url("a")' })],
      },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
