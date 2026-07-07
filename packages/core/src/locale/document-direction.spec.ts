import { ApplicationRef, LOCALE_ID, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { KjLocale } from './locale';
import { provideKjLocale } from './locale.config';
import { provideKjDocumentDirection } from './document-direction';

/**
 * Boot an environment with the direction wiring installed, flush the root
 * effect once, and hand back the live `KjLocale` plus a `flush()` helper.
 */
function setup(providers: unknown[], platform: 'browser' | 'server' = 'browser') {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: LOCALE_ID, useValue: 'en-US' },
      ...(platform === 'server' ? [{ provide: PLATFORM_ID, useValue: 'server' }] : []),
      ...(providers as []),
      provideKjDocumentDirection(),
    ],
  });
  // Injecting ApplicationRef instantiates the environment injector, which runs
  // the environment initializer that registers the direction effect.
  const appRef = TestBed.inject(ApplicationRef);
  const locale = TestBed.inject(KjLocale);
  const flush = () => appRef.tick();
  return { locale, flush };
}

describe('provideKjDocumentDirection', () => {
  const html = document.documentElement;
  let original: string | null;

  beforeEach(() => {
    original = html.getAttribute('dir');
    html.removeAttribute('dir');
  });

  afterEach(() => {
    if (original === null) html.removeAttribute('dir');
    else html.setAttribute('dir', original);
  });

  it('writes the resolved direction onto <html dir> in the browser', () => {
    const { flush } = setup([provideKjLocale({ locale: 'ar-EG' })]);
    flush();
    expect(html.getAttribute('dir')).toBe('rtl');
  });

  it('reacts to runtime setDirection changes', () => {
    const { locale, flush } = setup([provideKjLocale({ locale: 'en-US' })]);
    flush();
    expect(html.getAttribute('dir')).toBe('ltr');

    locale.setDirection('rtl');
    flush();
    expect(html.getAttribute('dir')).toBe('rtl');

    locale.setDirection('ltr');
    flush();
    expect(html.getAttribute('dir')).toBe('ltr');
  });

  it('does not touch the DOM on the server (SSR-safe)', () => {
    html.setAttribute('dir', 'untouched');
    const { flush } = setup([provideKjLocale({ locale: 'ar-EG' })], 'server');
    flush();
    // The initializer returned early; the attribute is left as the app set it.
    expect(html.getAttribute('dir')).toBe('untouched');
  });
});
