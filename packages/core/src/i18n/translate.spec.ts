import { Component, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { KjLocale } from '../locale/locale';
import { provideKjLocale } from '../locale/locale.config';
import { FR_CATALOG } from './catalogs/fr';
import { KjTranslate } from './translate';
import { provideKjTranslations } from './translate.config';
import { KjTranslateService } from './translate.service';

function setup(providers: unknown[] = []): {
  svc: KjTranslateService;
  locale: KjLocale;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: LOCALE_ID, useValue: 'en-US' }, ...(providers as [])],
  });
  return {
    svc: TestBed.inject(KjTranslateService),
    locale: TestBed.inject(KjLocale),
  };
}

describe('KjTranslateService', () => {
  describe('key lookup', () => {
    it('returns the English source value by default', () => {
      const { svc } = setup();
      expect(svc.translate('toast.close')).toBe('Close notification');
    });

    it('returns the key itself for an unknown key (never blanks)', () => {
      const { svc } = setup();
      // Cast: exercising the runtime guard for a key outside the union.
      expect(svc.translate('missing.key' as 'toast.close')).toBe('missing.key');
    });
  });

  describe('interpolation', () => {
    it('substitutes {name} placeholders from params', () => {
      const { svc } = setup();
      expect(svc.translate('pagination.pageOf', { page: 3, total: 12 })).toBe(
        'Page 3 of 12',
      );
    });

    it('leaves unknown placeholders untouched', () => {
      const { svc } = setup();
      expect(svc.translate('pagination.page', {})).toBe('Page {page}');
    });
  });

  describe('locale switch', () => {
    it('selects the registered catalog for the active language', () => {
      const { svc } = setup([
        provideKjLocale({ locale: 'fr-FR' }),
        provideKjTranslations({ fr: FR_CATALOG }),
      ]);
      expect(svc.translate('toast.close')).toBe('Fermer la notification');
      expect(svc.translate('pagination.pageOf', { page: 3, total: 12 })).toBe(
        'Page 3 sur 12',
      );
    });

    it('reacts to setLocale at runtime', () => {
      const { svc, locale } = setup([provideKjTranslations({ fr: FR_CATALOG })]);
      const label = svc.translation('toast.close');
      expect(label()).toBe('Close notification');
      locale.setLocale('fr-FR');
      expect(label()).toBe('Fermer la notification');
    });

    it('matches a bare language subtag when no exact tag is registered', () => {
      const { svc } = setup([
        provideKjLocale({ locale: 'fr-CA' }),
        provideKjTranslations({ fr: FR_CATALOG }),
      ]);
      expect(svc.translate('pagination.next')).toBe('Page suivante');
    });
  });

  describe('missing-key fallback', () => {
    it('falls through to English when the alternate catalog omits a key', () => {
      const { svc } = setup([
        provideKjLocale({ locale: 'fr-FR' }),
        provideKjTranslations({ fr: { 'toast.close': 'Fermer' } }),
      ]);
      expect(svc.translate('toast.close')).toBe('Fermer');
      // Not defined in the partial fr catalog → English source.
      expect(svc.translate('dialog.close')).toBe('Close dialog');
    });

    it('falls back to English for an unregistered locale', () => {
      const { svc } = setup([provideKjLocale({ locale: 'de-DE' })]);
      expect(svc.translate('toast.close')).toBe('Close notification');
    });
  });

  describe('runtime register()', () => {
    it('merges a catalog registered after construction', () => {
      const { svc, locale } = setup();
      svc.register('es', { 'toast.close': 'Cerrar notificación' });
      locale.setLocale('es-ES');
      expect(svc.translate('toast.close')).toBe('Cerrar notificación');
    });
  });
});

describe('KjTranslate directive', () => {
  it('writes the translation to text content', async () => {
    @Component({
      standalone: true,
      imports: [KjTranslate],
      template: `<span data-testid="t" [kjTranslate]="'pagination.pageOf'"
        [kjTranslateParams]="{ page: 2, total: 8 }"></span>`,
    })
    class Host {}

    const { getByTestId } = await render(Host, {
      providers: [{ provide: LOCALE_ID, useValue: 'en-US' }],
    });
    expect(getByTestId('t').textContent).toBe('Page 2 of 8');
  });

  @Component({
    standalone: true,
    imports: [KjTranslate],
    template: `<button
      data-testid="b"
      [kjTranslate]="'toast.close'"
      kjTranslateAttr="aria-label"
    >×</button>`,
  })
  class AttrHost {}

  it('writes the translation to a named attribute (English source)', async () => {
    const { getByTestId } = await render(AttrHost, {
      providers: [{ provide: LOCALE_ID, useValue: 'en-US' }],
    });
    expect(getByTestId('b').getAttribute('aria-label')).toBe(
      'Close notification',
    );
  });

  it('reflects the selected locale catalog', async () => {
    const { getByTestId } = await render(AttrHost, {
      providers: [
        { provide: LOCALE_ID, useValue: 'en-US' },
        provideKjLocale({ locale: 'fr-FR' }),
        provideKjTranslations({ fr: FR_CATALOG }),
      ],
    });
    expect(getByTestId('b').getAttribute('aria-label')).toBe(
      'Fermer la notification',
    );
  });

  it('reacts to a runtime setLocale', async () => {
    const { getByTestId, detectChanges } = await render(AttrHost, {
      providers: [
        { provide: LOCALE_ID, useValue: 'en-US' },
        provideKjTranslations({ fr: FR_CATALOG }),
      ],
    });
    const btn = getByTestId('b');
    expect(btn.getAttribute('aria-label')).toBe('Close notification');

    TestBed.inject(KjLocale).setLocale('fr-FR');
    detectChanges();
    expect(btn.getAttribute('aria-label')).toBe('Fermer la notification');
  });
});
