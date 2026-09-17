import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { describe, expect, test, beforeEach } from 'vitest';
import { App } from './app';
import { LoadingService } from './services/loading.service';
import { DocsManifestProvider } from './services/docs-manifest.provider';
import { RoadmapDataProvider } from './services/roadmap-data.provider';
import type { RoadmapItem } from './pages/roadmap/roadmap-data';

class StubManifestProvider extends DocsManifestProvider {
  override getManifest() { return null; }
  override getSlugs() { return []; }
}
class StubRoadmapProvider extends RoadmapDataProvider {
  override getItems(): readonly RoadmapItem[] | null { return null; }
}

/**
 * SSR review F-2. Every route is prerendered, so the content is in the HTML
 * from the first byte. The shell used to render `<kj-loading-screen>`
 * (`position: fixed; inset: 0; z-index: 9999`) *and* put `visibility: hidden`
 * on the content, both cleared only after `appRef.isStable` fired in the
 * browser — so the prerendered paint was thrown away, and a client whose JS
 * never ran was left staring at a splash with the content occluded behind it.
 */
describe('App shell', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: DocsManifestProvider, useClass: StubManifestProvider },
        { provide: RoadmapDataProvider, useClass: StubRoadmapProvider },
      ],
    });
  });

  test('the splash is not showing on first render', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(TestBed.inject(LoadingService).isLoading()).toBe(false);
    expect(fixture.nativeElement.querySelector('kj-loading-screen')).toBeNull();
  });

  test('the shell content is not hidden on first render', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const shell = fixture.nativeElement.querySelector('.app-shell') as HTMLElement;
    expect(shell).not.toBeNull();
    expect(shell.classList.contains('content-hidden')).toBe(false);
  });

  test('the splash is still available for client-side transitions', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const loading = TestBed.inject(LoadingService);
    loading.show();
    fixture.detectChanges();
    const shell = fixture.nativeElement.querySelector('.app-shell') as HTMLElement;
    expect(shell.classList.contains('content-hidden')).toBe(true);
    loading.hide();
    fixture.detectChanges();
    expect(shell.classList.contains('content-hidden')).toBe(false);
  });
});

describe('LoadingService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  test('is seeded false so prerendered pages paint immediately', () => {
    expect(TestBed.inject(LoadingService).isLoading()).toBe(false);
  });

  test('show / hide flip the flag', () => {
    const svc = TestBed.inject(LoadingService);
    svc.show();
    expect(svc.isLoading()).toBe(true);
    svc.hide();
    expect(svc.isLoading()).toBe(false);
  });
});
