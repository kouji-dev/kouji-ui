import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ThemeGeneratorSidebarComponent } from './theme-generator-sidebar';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { DocsManifestProvider } from '../../services/docs-manifest.provider';
import { SidebarToggleService } from '../../services/sidebar-toggle.service';
import type { DraftTheme, ResolvedTokens } from '../../lib/theme/types';

class StubManifestProvider {
  getManifest() { return null; }
}

const STUB_COLORS = {
  'base-100': 'oklch(100% 0 0)',
  'primary': 'oklch(60% 0.2 250)',
  'secondary': 'oklch(60% 0.2 300)',
  'accent': 'oklch(60% 0.2 200)',
  'neutral': 'oklch(40% 0 0)',
  'info': 'oklch(60% 0.15 220)',
  'success': 'oklch(60% 0.2 140)',
  'warning': 'oklch(70% 0.2 80)',
  'destructive': 'oklch(55% 0.25 25)',
} as const;

const STUB_DRAFT: DraftTheme = {
  name: 'kouji',
  colors: { ...STUB_COLORS },
  contentOverrides: {},
  shape: { radiusBox: 8, radiusField: 4, radiusSelector: 999, border: 1, depth: 1 },
  type: { fontSans: 'system-ui, sans-serif', fontMono: 'monospace', fontDisplay: 'system-ui, sans-serif' },
  motion: { transition: '0.2s ease' },
};

const STUB_RESOLVED: ResolvedTokens = {
  colors: { ...STUB_COLORS },
  derivedBase: { base200: 'oklch(95% 0 0)', base300: 'oklch(90% 0 0)' },
  contents: {
    'base-200': 'oklch(20% 0 0)',
    'base-300': 'oklch(20% 0 0)',
    'base-content': 'oklch(20% 0 0)',
    'primary-content': 'oklch(98% 0.02 250)',
    'secondary-content': 'oklch(98% 0.02 300)',
    'accent-content': 'oklch(98% 0.02 200)',
    'neutral-content': 'oklch(98% 0 0)',
    'info-content': 'oklch(98% 0.02 220)',
    'success-content': 'oklch(98% 0.02 140)',
    'warning-content': 'oklch(15% 0.02 80)',
    'destructive-content': 'oklch(98% 0.02 25)',
  },
  shape: { radiusBox: '8px', radiusField: '4px', radiusSelector: '999px', border: '1px', depth: '1' },
  type: { fontSans: 'system-ui, sans-serif', fontMono: 'monospace', fontDisplay: 'system-ui, sans-serif' },
  motion: { transition: '0.2s ease' },
};

class StubDraftService {
  loadFork = vi.fn();
  loadSaved = vi.fn();
  list = () => [];
  setName = vi.fn();
  setColor = vi.fn();
  setColors = vi.fn();
  setContentOverride = vi.fn();
  setShape = vi.fn();
  setFont = vi.fn();
  setMotion = vi.fn();
  rederiveFromPrimary = vi.fn();
  draft = () => STUB_DRAFT;
  dirtySlots = () => new Set<string>();
  resolvedTokens = () => STUB_RESOLVED;
}

const baseProviders = [
  provideRouter([]),
  { provide: DocsManifestProvider, useClass: StubManifestProvider },
  SidebarToggleService,
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

describe('ThemeGeneratorSidebarComponent — Col B palette actions', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: DocsManifestProvider, useClass: StubManifestProvider },
        SidebarToggleService,
      ],
    });
  });

  test('clicking a swatch sets all 9 colors', async () => {
    const fixture = TestBed.createComponent(ThemeGeneratorSidebarComponent);
    fixture.detectChanges();
    const draft = TestBed.inject(ThemeDraftService);
    const swatch = fixture.nativeElement.querySelector('kj-seed-swatch-grid button[data-hex]') as HTMLButtonElement;
    expect(swatch).toBeTruthy();
    const hex = swatch.dataset['hex']!;
    swatch.click();
    fixture.detectChanges();
    expect(draft.draft().colors.primary.toLowerCase()).toBe(hex.toLowerCase());
    expect(draft.dirtySlots().size).toBe(0);
  });

  test('randomize replaces all 9 colors and clears dirty', () => {
    const fixture = TestBed.createComponent(ThemeGeneratorSidebarComponent);
    fixture.detectChanges();
    const draft = TestBed.inject(ThemeDraftService);
    draft.setColor('primary', '#abcdef');
    expect(draft.dirtySlots().size).toBe(1);
    (fixture.nativeElement.querySelector('[data-action="randomize"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(draft.dirtySlots().size).toBe(0);
  });

  test('rederive preserves dirty accent', () => {
    const fixture = TestBed.createComponent(ThemeGeneratorSidebarComponent);
    fixture.detectChanges();
    const draft = TestBed.inject(ThemeDraftService);
    draft.loadFork('kouji');
    draft.setColor('accent', '#abc123');
    (fixture.nativeElement.querySelector('[data-action="rederive"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(draft.draft().colors.accent).toBe('#abc123');
  });
});
