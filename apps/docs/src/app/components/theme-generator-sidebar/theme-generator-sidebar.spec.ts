import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ThemeGeneratorSidebarComponent } from './theme-generator-sidebar';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { DocsManifestProvider } from '../../services/docs-manifest.provider';

class StubManifestProvider {
  getManifest() { return null; }
}

class StubDraftService {
  loadFork = vi.fn();
  loadSaved = vi.fn();
  list = () => [];
  setName = vi.fn();
  draft = () => ({ name: 'kouji' } as { name: string });
}

const baseProviders = [
  provideRouter([]),
  { provide: DocsManifestProvider, useClass: StubManifestProvider },
];

describe('ThemeGeneratorSidebarComponent — Col A', () => {
  test('renders all built-in themes', async () => {
    await render(ThemeGeneratorSidebarComponent, {
      providers: [...baseProviders, { provide: ThemeDraftService, useClass: StubDraftService }],
    });
    for (const name of ['kouji', 'dark', 'retro', 'cyberpunk', 'corporate']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') })).toBeInTheDocument();
    }
  });

  test('clicking a built-in calls draftService.loadFork', async () => {
    const stub = new StubDraftService();
    await render(ThemeGeneratorSidebarComponent, {
      providers: [...baseProviders, { provide: ThemeDraftService, useValue: stub }],
    });
    await userEvent.click(screen.getByRole('button', { name: /^retro$/i }));
    expect(stub.loadFork).toHaveBeenCalledWith('retro');
  });
});
