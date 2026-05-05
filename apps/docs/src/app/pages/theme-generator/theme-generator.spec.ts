import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { describe, expect, test, beforeEach } from 'vitest';
import { ThemeGeneratorComponent } from './theme-generator';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { DocsManifestProvider } from '../../services/docs-manifest.provider';

class StubManifestProvider extends DocsManifestProvider {
  getManifest() { return null; }
  getSlugs() { return []; }
}

describe('ThemeGeneratorComponent (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.getElementById('kj-draft-style')?.remove();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: DocsManifestProvider, useClass: StubManifestProvider },
      ],
    });
  });

  test('mounts and the kj-draft-style tag is created', () => {
    const fixture = TestBed.createComponent(ThemeGeneratorComponent);
    fixture.detectChanges();
    const tag = document.getElementById('kj-draft-style') as HTMLStyleElement | null;
    expect(tag).not.toBeNull();
    expect(tag!.textContent).toContain('[data-theme="custom-draft"]');
  });

  test('editing draft updates the style tag content', () => {
    const fixture = TestBed.createComponent(ThemeGeneratorComponent);
    fixture.detectChanges();
    const svc = TestBed.inject(ThemeDraftService);

    svc.loadFork('kouji');
    fixture.detectChanges();
    const cssAfter = document.getElementById('kj-draft-style')!.textContent!;
    expect(cssAfter).toContain(svc.draft().colors.primary);
  });

  test('preview wrapper has data-theme="custom-draft"', () => {
    const fixture = TestBed.createComponent(ThemeGeneratorComponent);
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector('.generator-preview');
    expect(wrapper.getAttribute('data-theme')).toBe('custom-draft');
  });

  test('destroying the component removes the style tag', () => {
    const fixture = TestBed.createComponent(ThemeGeneratorComponent);
    fixture.detectChanges();
    expect(document.getElementById('kj-draft-style')).not.toBeNull();
    fixture.destroy();
    expect(document.getElementById('kj-draft-style')).toBeNull();
  });
});
