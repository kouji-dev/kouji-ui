import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { describe, expect, test } from 'vitest';
import { DocsSidebarComponent } from './docs-sidebar';
import { DocsManifestProvider } from '../../services/docs-manifest.provider';
import { SidebarToggleService } from '../../services/sidebar-toggle.service';

@Component({ standalone: true, template: '' })
class StubPage {}

class StubManifestProvider {
  getManifest() {
    return null;
  }
}

const stubRoutes = [
  { path: 'docs', component: StubPage },
  { path: 'docs/getting-started', component: StubPage },
  { path: 'docs/headless', component: StubPage },
  { path: 'docs/components', component: StubPage },
  { path: 'docs/headless/:slug', component: StubPage },
  { path: 'docs/components/:slug', component: StubPage },
];

const baseProviders = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter(stubRoutes),
  { provide: DocsManifestProvider, useClass: StubManifestProvider },
  SidebarToggleService,
];

describe('DocsSidebarComponent', () => {
  test('renders Getting Started and browse heading inside Documentation sections nav', async () => {
    await render(DocsSidebarComponent, { providers: baseProviders });
    const nav = screen.getByRole('navigation', { name: /documentation sections/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /getting started/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^headless$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^components$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/browse by category/i)).toBeInTheDocument();
  });

  test('marks Getting Started with aria-current when URL matches', async () => {
    const { fixture } = await render(DocsSidebarComponent, { providers: baseProviders });
    const router = fixture.debugElement.injector.get(Router);
    await router.navigateByUrl('/docs/getting-started');
    fixture.detectChanges();
    expect(screen.getByRole('link', { name: /getting started/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('exposes unified category tree', async () => {
    await render(DocsSidebarComponent, { providers: baseProviders });
    expect(screen.getByRole('tree', { name: /browse by category/i })).toBeInTheDocument();
  });
});
