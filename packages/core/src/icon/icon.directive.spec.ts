import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { KjIconDirective } from './icon.directive';
import { provideIcons } from './icon.providers';

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
