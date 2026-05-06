import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { describe, expect, test } from 'vitest';
import { DocsSidebarComponent } from './docs-sidebar';
import { DocsManifestProvider } from '../../services/docs-manifest.provider';

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
