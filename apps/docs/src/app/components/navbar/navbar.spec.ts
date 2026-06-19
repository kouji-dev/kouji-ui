import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { NavbarComponent } from './navbar';
import { DocsManifestProvider } from '../../services/docs-manifest.provider';

class StubManifestProvider extends DocsManifestProvider {
  override getManifest() { return null; }
  override getSlugs() { return []; }
}

const baseProviders = [
  provideRouter([]),
  provideHttpClient(),
  { provide: DocsManifestProvider, useClass: StubManifestProvider },
];

describe('NavbarComponent', () => {
  test('renders Docs and Theme Generator links', async () => {
    await render(NavbarComponent, { providers: baseProviders });
    expect(screen.getByRole('link', { name: /docs/i })).toHaveAttribute('href', '/docs');
    expect(screen.getByRole('link', { name: /theme generator/i })).toHaveAttribute('href', '/theme-generator');
  });

  test('renders the Kouji.dev link opening in a new tab', async () => {
    await render(NavbarComponent, { providers: baseProviders });
    const link = screen.getByRole('link', { name: /kouji\.dev/i });
    expect(link).toHaveAttribute('href', 'https://kouji.dev');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('does not render a search trigger (moved to sidebar)', async () => {
    await render(NavbarComponent, { providers: baseProviders });
    expect(screen.queryByRole('button', { name: /search docs/i })).toBeNull();
  });

  test('theme picker button toggles aria-expanded', async () => {
    await render(NavbarComponent, { providers: baseProviders });
    const trigger = screen.getByRole('button', { name: /current theme:/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
