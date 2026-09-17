import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { signal } from '@angular/core';
import { KJ_VARIANT_FALLBACK } from '../presets';
import { KjBadge } from './badge';
import { KJ_BADGE_CONFIG, KJ_BADGE_DEFAULTS, provideKjBadge } from './config';

expect.extend(toHaveNoViolations);

describe('KjBadge', () => {
  it('sets data-variant attribute', async () => {
    const { container } = await render(`<span kjBadge [kjVariant]="'destructive'">New</span>`, { imports: [KjBadge] });
    expect(container.querySelector('span')).toHaveAttribute('data-variant', 'destructive');
  });
  it('defaults to default variant', async () => {
    const { container } = await render(`<span kjBadge>Beta</span>`, { imports: [KjBadge] });
    expect(container.querySelector('span')).toHaveAttribute('data-variant', 'default');
  });
  it('sets data-dot attribute when kjBadgeDot is true', async () => {
    const { container } = await render(`<span kjBadge [kjBadgeDot]="true">Active</span>`, { imports: [KjBadge] });
    expect(container.querySelector('span')).toHaveAttribute('data-dot', '');
  });
  it('reflects data-dot from the bare attribute form (arch F-2)', async () => {
    const { container } = await render(`<span kjBadge kjBadgeDot>Active</span>`, { imports: [KjBadge] });
    expect(container.querySelector('span')).toHaveAttribute('data-dot', '');
  });
  it('omits data-dot attribute by default', async () => {
    const { container } = await render(`<span kjBadge>Beta</span>`, { imports: [KjBadge] });
    expect(container.querySelector('span')).not.toHaveAttribute('data-dot');
  });
  it('passes axe audit', async () => {
    const { container } = await render(`<span kjBadge>Beta</span>`, { imports: [KjBadge] });
    expect(await axe(container)).toHaveNoViolations();
  });
});

/**
 * cust F-2 item 3: badge is preset-driven like the rest of core, rather than
 * a hand-rolled `kjBadgeVariant` input typed closed against CSS that ships in
 * another package. What that buys, asserted here: a configurable variant /
 * size vocabulary, the `KJ_VARIANT_FALLBACK` cascade, and a dev-mode warning
 * on a value the app never registered.
 */
describe('KjBadge presets (cust F-2)', () => {
  it('reflects data-size from the composed KjSize', async () => {
    const { container } = await render(`<span kjBadge kjSize="lg">Beta</span>`, { imports: [KjBadge] });
    expect(container.querySelector('span')).toHaveAttribute('data-size', 'lg');
  });

  it('falls back to the configured defaults when neither input is bound', async () => {
    const { container } = await render(`<span kjBadge>Beta</span>`, { imports: [KjBadge] });
    const el = container.querySelector('span')!;
    expect(el).toHaveAttribute('data-variant', KJ_BADGE_DEFAULTS.defaults.variant);
    expect(el).toHaveAttribute('data-size', KJ_BADGE_DEFAULTS.defaults.size);
  });

  it('provideKjBadge changes the default without restating the siblings', async () => {
    const { container } = await render(`<span kjBadge>Beta</span>`, {
      imports: [KjBadge],
      providers: [...provideKjBadge({ defaults: { size: 'sm' } })],
    });
    const el = container.querySelector('span')!;
    expect(el).toHaveAttribute('data-size', 'sm');
    // The variant default survived the partial override.
    expect(el).toHaveAttribute('data-variant', 'default');
  });

  it('provideKjBadge registers an extra variant (no warning, reflected verbatim)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = await render(`<span kjBadge kjVariant="brand">Beta</span>`, {
      imports: [KjBadge],
      providers: [
        ...provideKjBadge({ variants: [...KJ_BADGE_DEFAULTS.variants, 'brand'] }),
      ],
    });
    expect(container.querySelector('span')).toHaveAttribute('data-variant', 'brand');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns once in dev mode on an unregistered variant, and still reflects it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = await render(`<span kjBadge kjVariant="nope">Beta</span>`, {
      imports: [KjBadge],
    });
    expect(container.querySelector('span')).toHaveAttribute('data-variant', 'nope');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('inherits KJ_VARIANT_FALLBACK when kjVariant is unset', async () => {
    const { container } = await render(`<span kjBadge>Beta</span>`, {
      imports: [KjBadge],
      providers: [{ provide: KJ_VARIANT_FALLBACK, useValue: signal('secondary') }],
    });
    expect(container.querySelector('span')).toHaveAttribute('data-variant', 'secondary');
  });

  it('an explicit kjVariant still wins over the fallback', async () => {
    const { container } = await render(`<span kjBadge kjVariant="outline">Beta</span>`, {
      imports: [KjBadge],
      providers: [{ provide: KJ_VARIANT_FALLBACK, useValue: signal('secondary') }],
    });
    expect(container.querySelector('span')).toHaveAttribute('data-variant', 'outline');
  });

  it('KJ_BADGE_CONFIG resolves to the shipped defaults with no provider', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(KJ_BADGE_CONFIG)).toBe(KJ_BADGE_DEFAULTS);
  });
});
