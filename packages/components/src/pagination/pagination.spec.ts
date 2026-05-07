import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  KjPaginationComponent,
  KjPaginationItemComponent,
  KjPaginationPreviousComponent,
  KjPaginationNextComponent,
  KjPaginationFirstComponent,
  KjPaginationLastComponent,
  KjPaginationEllipsisComponent,
  KjPaginationInfoComponent,
  KjPaginationDefaultComponent,
} from './pagination';

const imports = [
  KjPaginationComponent,
  KjPaginationItemComponent,
  KjPaginationPreviousComponent,
  KjPaginationNextComponent,
  KjPaginationFirstComponent,
  KjPaginationLastComponent,
  KjPaginationEllipsisComponent,
  KjPaginationInfoComponent,
  KjPaginationDefaultComponent,
];

@Component({
  standalone: true,
  imports,
  template: `
    <kj-pagination [(kjPage)]="page" [kjTotalPages]="totalPages()" #p="kjPagination">
      <kj-pagination-first>«</kj-pagination-first>
      <kj-pagination-previous>‹</kj-pagination-previous>
      @for (token of p.pages(); track token) {
        @if (token === 'ellipsis-left' || token === 'ellipsis-right') {
          <kj-pagination-ellipsis>…</kj-pagination-ellipsis>
        } @else {
          <kj-pagination-item [kjPage]="token">{{ token }}</kj-pagination-item>
        }
      }
      <kj-pagination-next>›</kj-pagination-next>
      <kj-pagination-last>»</kj-pagination-last>
      <kj-pagination-info />
    </kj-pagination>
  `,
})
class HostComponent {
  readonly page = signal(1);
  readonly totalPages = signal(10);
}

@Component({
  standalone: true,
  imports,
  template: `
    <kj-pagination-default [(kjPage)]="page" [kjTotalPages]="totalPages()" />
  `,
})
class DefaultHost {
  readonly page = signal(1);
  readonly totalPages = signal(10);
}

describe('KjPaginationComponent (wrapper)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent, DefaultHost] });
  });

  test('renders the projected children — root nav, item buttons, boundary controls, info', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const nav = root.querySelector('kj-pagination');
    expect(nav).not.toBeNull();
    expect(nav!.getAttribute('aria-label')).toBe('Pagination');

    // Numeric items render as <button kjPaginationItem class="kj-pagination-item">.
    const items = root.querySelectorAll<HTMLButtonElement>('button.kj-pagination-item');
    expect(items.length).toBeGreaterThan(0);

    // Boundary controls — one per role.
    expect(
      root.querySelector('button.kj-pagination-action--first[data-pagination-action="first"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('button.kj-pagination-action--previous[data-pagination-action="previous"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('button.kj-pagination-action--next[data-pagination-action="next"]'),
    ).not.toBeNull();
    expect(
      root.querySelector('button.kj-pagination-action--last[data-pagination-action="last"]'),
    ).not.toBeNull();

    // Info span attribute set by directive.
    const info = root.querySelector('kj-pagination-info');
    expect(info).not.toBeNull();
    expect(info!.hasAttribute('data-pagination-info')).toBe(true);
  });

  test('aliased inputs forward to the host directive — kjPage, kjTotalPages reflected as data-*', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const nav = root.querySelector('kj-pagination')!;

    expect(nav.getAttribute('data-page')).toBe('1');
    expect(nav.getAttribute('data-total-pages')).toBe('10');

    fixture.componentInstance.page.set(4);
    fixture.detectChanges();

    expect(nav.getAttribute('data-page')).toBe('4');
  });

  test('current page button reflects aria-current="page"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.page.set(3);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const items = root.querySelectorAll<HTMLButtonElement>('button.kj-pagination-item');
    const current = Array.from(items).find((b) => b.getAttribute('aria-current') === 'page');
    expect(current).toBeDefined();
    expect(current!.textContent?.trim()).toBe('3');

    // Only one current button at a time.
    const allCurrent = Array.from(items).filter(
      (b) => b.getAttribute('aria-current') === 'page',
    );
    expect(allCurrent.length).toBe(1);
  });

  test('boundaries: First / Previous disabled on page 1; Next / Last disabled on last page', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const first = root.querySelector('button.kj-pagination-action--first')!;
    const prev = root.querySelector('button.kj-pagination-action--previous')!;
    const next = root.querySelector('button.kj-pagination-action--next')!;
    const last = root.querySelector('button.kj-pagination-action--last')!;

    // On page 1.
    expect(first.getAttribute('aria-disabled')).toBe('true');
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    expect(next.getAttribute('aria-disabled')).toBeNull();
    expect(last.getAttribute('aria-disabled')).toBeNull();

    // Jump to the last page.
    fixture.componentInstance.page.set(10);
    fixture.detectChanges();

    expect(first.getAttribute('aria-disabled')).toBeNull();
    expect(prev.getAttribute('aria-disabled')).toBeNull();
    expect(next.getAttribute('aria-disabled')).toBe('true');
    expect(last.getAttribute('aria-disabled')).toBe('true');
  });

  test('clicking a numeric item updates the bound page model', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const items = root.querySelectorAll<HTMLButtonElement>('button.kj-pagination-item');
    // Click "2".
    const two = Array.from(items).find((b) => b.textContent?.trim() === '2');
    expect(two).toBeDefined();
    two!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.page()).toBe(2);
  });

  test('clicking a disabled boundary control is a no-op', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const prev = root.querySelector<HTMLButtonElement>('button.kj-pagination-action--previous')!;
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    prev.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.page()).toBe(1);
  });

  test('kj-pagination-default renders the canonical layout from kjPage + kjTotalPages alone', () => {
    const fixture = TestBed.createComponent(DefaultHost);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    // Auto-renders First, Previous, page items, Next, Last.
    expect(root.querySelector('button.kj-pagination-action--first')).not.toBeNull();
    expect(root.querySelector('button.kj-pagination-action--previous')).not.toBeNull();
    expect(root.querySelector('button.kj-pagination-action--next')).not.toBeNull();
    expect(root.querySelector('button.kj-pagination-action--last')).not.toBeNull();
    expect(root.querySelectorAll('button.kj-pagination-item').length).toBeGreaterThan(0);
  });
});
