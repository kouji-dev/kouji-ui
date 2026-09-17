import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjBreadcrumb, KjBreadcrumbEllipsis, KjBreadcrumbItem, KjBreadcrumbList } from '../breadcrumb/index';
import { provideKjBreadcrumb } from '../breadcrumb/config';
import {
  KjPagination,
  KjPaginationEllipsis,
  KjPaginationFirst,
  KjPaginationInfo,
  KjPaginationItem,
  KjPaginationLast,
  KjPaginationNext,
  KjPaginationPrevious,
} from '../pagination/index';
import { provideKjPagination } from '../pagination/config';
import { KjSpinner } from '../spinner/spinner';
import { provideKjSpinner } from '../spinner/config';
import { provideKjLocale } from '../locale/index';
import { EN_CATALOG, FR_CATALOG, provideKjTranslations } from './index';

/**
 * cust F-7 — the catalog claims to be "the source of truth for kouji-ui's
 * visible / assistive-text strings", but pagination, breadcrumb and spinner
 * each shipped their own hard-coded English in a config token that no
 * translation could reach. These tests pin the inverted contract: the catalog
 * supplies every string, and the config field is an optional single-string
 * override that starts out `undefined`.
 */

const PAGINATION_IMPORTS = [
  KjPagination,
  KjPaginationItem,
  KjPaginationPrevious,
  KjPaginationNext,
  KjPaginationFirst,
  KjPaginationLast,
  KjPaginationEllipsis,
  KjPaginationInfo,
];

const PAGINATION_TEMPLATE = `
  <nav kjPagination [kjTotalPages]="10" [kjPage]="3">
    <button kjPaginationFirst>«</button>
    <button kjPaginationPrevious>‹</button>
    <button kjPaginationItem [kjPage]="3">3</button>
    <span kjPaginationEllipsis>…</span>
    <button kjPaginationNext>›</button>
    <button kjPaginationLast>»</button>
    <span kjPaginationInfo></span>
  </nav>`;

function paginationLabels(container: Element) {
  return {
    nav: container.querySelector('[kjPagination]')!.getAttribute('aria-label'),
    first: container.querySelector('[kjPaginationFirst]')!.getAttribute('aria-label'),
    previous: container.querySelector('[kjPaginationPrevious]')!.getAttribute('aria-label'),
    next: container.querySelector('[kjPaginationNext]')!.getAttribute('aria-label'),
    last: container.querySelector('[kjPaginationLast]')!.getAttribute('aria-label'),
    item: container.querySelector('[kjPaginationItem]')!.getAttribute('aria-label'),
    info: container.querySelector('[kjPaginationInfo]')!.textContent,
  };
}

describe('Pagination strings resolve from the i18n catalog', () => {
  it('uses the English catalog with no configuration at all', async () => {
    const { container } = await render(PAGINATION_TEMPLATE, { imports: PAGINATION_IMPORTS });
    expect(paginationLabels(container)).toEqual({
      nav: EN_CATALOG['pagination.nav'],
      first: EN_CATALOG['pagination.first'],
      previous: EN_CATALOG['pagination.previous'],
      next: EN_CATALOG['pagination.next'],
      last: EN_CATALOG['pagination.last'],
      item: 'Page 3',
      info: 'Page 3 of 10',
    });
  });

  it('translates from a registered catalog — no provideKjPagination needed', async () => {
    TestBed.configureTestingModule({
      providers: [provideKjLocale({ locale: 'fr' }), provideKjTranslations({ fr: FR_CATALOG })],
    });
    const { container } = await render(PAGINATION_TEMPLATE, { imports: PAGINATION_IMPORTS });
    expect(paginationLabels(container)).toEqual({
      nav: FR_CATALOG['pagination.nav'],
      first: FR_CATALOG['pagination.first'],
      previous: FR_CATALOG['pagination.previous'],
      next: FR_CATALOG['pagination.next'],
      last: FR_CATALOG['pagination.last'],
      item: 'Page 3',
      info: 'Page 3 sur 10',
    });
  });

  it('the ellipsis readout is translated too', async () => {
    TestBed.configureTestingModule({
      providers: [provideKjLocale({ locale: 'fr' }), provideKjTranslations({ fr: FR_CATALOG })],
    });
    const { container, fixture } = await render(PAGINATION_TEMPLATE, {
      imports: PAGINATION_IMPORTS,
    });
    fixture.detectChanges();
    const ellipsis = container.querySelector('[kjPaginationEllipsis]')!;
    expect(ellipsis.textContent).toContain(FR_CATALOG['pagination.more']);
  });

  it('a provideKjPagination label still overrides one string, locale-independently', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideKjLocale({ locale: 'fr' }),
        provideKjTranslations({ fr: FR_CATALOG }),
        ...provideKjPagination({ nextLabel: 'Suivant →' }),
      ],
    });
    const { container } = await render(PAGINATION_TEMPLATE, { imports: PAGINATION_IMPORTS });
    const labels = paginationLabels(container);
    expect(labels.next).toBe('Suivant →');
    // Every other string is untouched and still comes from the catalog.
    expect(labels.previous).toBe(FR_CATALOG['pagination.previous']);
  });

  it('ships no English literals in KJ_PAGINATION_DEFAULTS', async () => {
    const { KJ_PAGINATION_DEFAULTS } = await import('../pagination/config');
    expect(KJ_PAGINATION_DEFAULTS.navigationLabel).toBeUndefined();
    expect(KJ_PAGINATION_DEFAULTS.previousLabel).toBeUndefined();
    expect(KJ_PAGINATION_DEFAULTS.pageItemLabel).toBeUndefined();
    expect(KJ_PAGINATION_DEFAULTS.infoTemplate).toBeUndefined();
  });
});

const BREADCRUMB_IMPORTS = [KjBreadcrumb, KjBreadcrumbList, KjBreadcrumbItem, KjBreadcrumbEllipsis];

describe('Breadcrumb strings resolve from the i18n catalog', () => {
  it('uses the English catalog with no configuration at all', async () => {
    const { container } = await render(
      `<nav kjBreadcrumb><ol kjBreadcrumbList><li kjBreadcrumbItem>a</li></ol></nav>`,
      { imports: BREADCRUMB_IMPORTS },
    );
    expect(container.querySelector('[kjBreadcrumb]')!.getAttribute('aria-label')).toBe(
      EN_CATALOG['breadcrumb.nav'],
    );
  });

  it('translates from a registered catalog', async () => {
    TestBed.configureTestingModule({
      providers: [provideKjLocale({ locale: 'fr' }), provideKjTranslations({ fr: FR_CATALOG })],
    });
    const { container } = await render(
      `<nav kjBreadcrumb><ol kjBreadcrumbList><li kjBreadcrumbItem>a</li></ol></nav>`,
      { imports: BREADCRUMB_IMPORTS },
    );
    expect(container.querySelector('[kjBreadcrumb]')!.getAttribute('aria-label')).toBe(
      FR_CATALOG['breadcrumb.nav'],
    );
  });

  it('a provideKjBreadcrumb ariaLabel still overrides the catalog', async () => {
    TestBed.configureTestingModule({
      providers: [...provideKjBreadcrumb({ defaults: { ariaLabel: 'Trail' } })],
    });
    const { container } = await render(
      `<nav kjBreadcrumb><ol kjBreadcrumbList><li kjBreadcrumbItem>a</li></ol></nav>`,
      { imports: BREADCRUMB_IMPORTS },
    );
    expect(container.querySelector('[kjBreadcrumb]')!.getAttribute('aria-label')).toBe('Trail');
  });

  it('ships no English literals in KJ_BREADCRUMB_DEFAULTS', async () => {
    const { KJ_BREADCRUMB_DEFAULTS } = await import('../breadcrumb/config');
    expect(KJ_BREADCRUMB_DEFAULTS.defaults.ariaLabel).toBeUndefined();
    expect(KJ_BREADCRUMB_DEFAULTS.truncatedAriaLabel).toBeUndefined();
    expect(KJ_BREADCRUMB_DEFAULTS.ellipsisLabel).toBeUndefined();
  });
});

describe('Spinner accessible name resolves from the i18n catalog', () => {
  it('defaults to the English catalog entry', async () => {
    const { container } = await render(`<span kjSpinner></span>`, { imports: [KjSpinner] });
    expect(container.querySelector('[kjSpinner]')!.getAttribute('aria-label')).toBe(
      EN_CATALOG['spinner.loading'],
    );
  });

  it('follows a registered catalog', async () => {
    TestBed.configureTestingModule({
      providers: [provideKjLocale({ locale: 'fr' }), provideKjTranslations({ fr: FR_CATALOG })],
    });
    const { container } = await render(`<span kjSpinner></span>`, { imports: [KjSpinner] });
    expect(container.querySelector('[kjSpinner]')!.getAttribute('aria-label')).toBe(
      FR_CATALOG['spinner.loading'],
    );
  });

  it('a provideKjSpinner ariaLabel still overrides it', async () => {
    TestBed.configureTestingModule({
      providers: [...provideKjSpinner({ defaults: { ariaLabel: 'Working' } })],
    });
    const { container } = await render(`<span kjSpinner></span>`, { imports: [KjSpinner] });
    expect(container.querySelector('[kjSpinner]')!.getAttribute('aria-label')).toBe('Working');
  });
});
