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
  getManifest() { return null; }
}

const stubRoutes = [
  { path: 'docs', component: StubPage },
  { path: 'docs/getting-started', component: StubPage },
  { path: 'docs/headless', component: StubPage },
  { path: 'docs/components', component: StubPage },
];

const baseProviders = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter(stubRoutes),
  { provide: DocsManifestProvider, useClass: StubManifestProvider },
  SidebarToggleService,
];

describe('DocsSidebarComponent — Column A', () => {
  test('renders all three top-level rows', async () => {
    await render(DocsSidebarComponent, { providers: baseProviders });
    expect(screen.getByRole('link', { name: /getting started/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^headless$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^components$/i })).toBeInTheDocument();
  });

  test('marks Headless as active when URL matches', async () => {
    const { fixture } = await render(DocsSidebarComponent, { providers: baseProviders });
    const router = fixture.debugElement.injector.get(Router);
    await router.navigateByUrl('/docs/headless');
    fixture.detectChanges();
    expect(screen.getByRole('link', { name: /^headless$/i })).toHaveAttribute('aria-current', 'page');
  });
});

describe('DocsSidebarComponent — Column B', () => {
  test('Col B is hidden on /docs/getting-started', async () => {
    const { fixture } = await render(DocsSidebarComponent, { providers: baseProviders });
    const router = fixture.debugElement.injector.get(Router);
    await router.navigateByUrl('/docs/getting-started');
    fixture.detectChanges();
    expect(screen.queryByLabelText(/headless items/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/components items/i)).not.toBeInTheDocument();
  });

  test('Col B opens for /docs/headless with appropriate aria-label', async () => {
    const { fixture } = await render(DocsSidebarComponent, { providers: baseProviders });
    const router = fixture.debugElement.injector.get(Router);
    await router.navigateByUrl('/docs/headless');
    fixture.detectChanges();
    expect(screen.getByRole('navigation', { name: /headless items/i })).toBeInTheDocument();
  });
});
