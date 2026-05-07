import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  KjBreadcrumbComponent,
  KjBreadcrumbListComponent,
  KjBreadcrumbItemComponent,
  KjBreadcrumbLinkComponent,
  KjBreadcrumbCurrentComponent,
  KjBreadcrumbSeparatorComponent,
  KjBreadcrumbEllipsisComponent,
} from './breadcrumb';

const imports = [
  KjBreadcrumbComponent,
  KjBreadcrumbListComponent,
  KjBreadcrumbItemComponent,
  KjBreadcrumbLinkComponent,
  KjBreadcrumbCurrentComponent,
  KjBreadcrumbSeparatorComponent,
  KjBreadcrumbEllipsisComponent,
];

@Component({
  standalone: true,
  imports,
  template: `
    <kj-breadcrumb [kjMaxItems]="maxItems()" [kjOverflow]="overflow()" [kjSeparator]="separator()">
      <kj-breadcrumb-list>
        @for (crumb of crumbs(); track crumb.label; let last = $last) {
          <kj-breadcrumb-item>
            @if (last) {
              <kj-breadcrumb-current>{{ crumb.label }}</kj-breadcrumb-current>
            } @else {
              <kj-breadcrumb-link [kjHref]="crumb.href">{{ crumb.label }}</kj-breadcrumb-link>
            }
          </kj-breadcrumb-item>
        }
      </kj-breadcrumb-list>
    </kj-breadcrumb>
  `,
})
class HostComponent {
  readonly crumbs = signal<{ label: string; href: string }[]>([
    { label: 'Home', href: '/' },
    { label: 'Library', href: '/library' },
    { label: 'Data', href: '/library/data' },
  ]);
  readonly maxItems = signal<number>(4);
  readonly overflow = signal<'truncate' | 'menu' | 'none'>('truncate');
  readonly separator = signal<string | undefined>(undefined);
}

@Component({
  standalone: true,
  imports,
  template: `
    <kj-breadcrumb>
      <kj-breadcrumb-list>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/">Home</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-separator>›</kj-breadcrumb-separator>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/library">Library</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-separator>›</kj-breadcrumb-separator>
        <kj-breadcrumb-item>
          <kj-breadcrumb-current>Data</kj-breadcrumb-current>
        </kj-breadcrumb-item>
      </kj-breadcrumb-list>
    </kj-breadcrumb>
  `,
})
class ExplicitSeparatorHost {}

@Component({
  standalone: true,
  imports,
  template: `
    <kj-breadcrumb [kjMaxItems]="3">
      <kj-breadcrumb-list>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/">Home</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-ellipsis>…</kj-breadcrumb-ellipsis>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/a">A</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/b">B</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-current>Current</kj-breadcrumb-current>
        </kj-breadcrumb-item>
      </kj-breadcrumb-list>
    </kj-breadcrumb>
  `,
})
class TruncatedHost {}

describe('KjBreadcrumbComponent (wrapper)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent, ExplicitSeparatorHost, TruncatedHost],
    });
  });

  test('renders a <nav> with class kj-breadcrumb and aria-label="Breadcrumb"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('.kj-breadcrumb');
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  test('renders an <ol> with class kj-breadcrumb-list', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const ol = fixture.nativeElement.querySelector('.kj-breadcrumb-list');
    expect(ol).not.toBeNull();
  });

  test('renders one <li class="kj-breadcrumb-item"> per crumb', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.kj-breadcrumb-item');
    expect(items.length).toBe(3);
  });

  test('the terminal cell renders <span class="kj-breadcrumb-current"> with aria-current="page"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const current = fixture.nativeElement.querySelector('.kj-breadcrumb-current');
    expect(current).not.toBeNull();
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  test('non-terminal cells render <a class="kj-breadcrumb-link kj-link"> with href', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('a.kj-breadcrumb-link');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('/');
    expect(links[1].getAttribute('href')).toBe('/library');
  });

  test('the per-crumb link defaults to muted variant + sm size + hover underline', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a.kj-breadcrumb-link');
    expect(link.getAttribute('data-variant')).toBe('muted');
    expect(link.getAttribute('data-size')).toBe('sm');
    expect(link.getAttribute('data-underline')).toBe('hover');
  });

  test('explicit separator wrapper sets data-explicit-separators on the list', () => {
    const fixture = TestBed.createComponent(ExplicitSeparatorHost);
    fixture.detectChanges();
    const ol = fixture.nativeElement.querySelector('.kj-breadcrumb-list');
    expect(ol.getAttribute('data-explicit-separators')).toBe('');
    const seps = fixture.nativeElement.querySelectorAll('.kj-breadcrumb-separator');
    expect(seps.length).toBe(2);
    expect(seps[0].getAttribute('aria-hidden')).toBe('true');
    expect(seps[0].getAttribute('role')).toBe('presentation');
  });

  test('kjSeparator forwards to --kj-breadcrumb-separator-content', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.separator.set('›');
    fixture.detectChanges();
    const nav: HTMLElement = fixture.nativeElement.querySelector('.kj-breadcrumb');
    expect(nav.style.getPropertyValue('--kj-breadcrumb-separator-content')).toContain('›');
  });

  test('truncation hides interior items and surfaces hidden count in aria-label', () => {
    const fixture = TestBed.createComponent(TruncatedHost);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('.kj-breadcrumb');
    expect(nav.getAttribute('aria-label')).toContain('hidden');
    const items = fixture.nativeElement.querySelectorAll('.kj-breadcrumb-item');
    // 5 li items (one of them holds the ellipsis).
    expect(items.length).toBe(5);
  });

  test('ellipsis cell carries class kj-breadcrumb-ellipsis and renders inside its <li>', () => {
    const fixture = TestBed.createComponent(TruncatedHost);
    fixture.detectChanges();
    const ell = fixture.nativeElement.querySelector('.kj-breadcrumb-ellipsis');
    expect(ell).not.toBeNull();
    expect(ell.getAttribute('aria-hidden')).toBe('true');
  });

  test('overflow="none" disables truncation', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.crumbs.set([
      { label: 'Home', href: '/' },
      { label: 'A', href: '/a' },
      { label: 'B', href: '/b' },
      { label: 'C', href: '/c' },
      { label: 'D', href: '/d' },
      { label: 'Cur', href: '/cur' },
    ]);
    fixture.componentInstance.maxItems.set(3);
    fixture.componentInstance.overflow.set('none');
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.kj-breadcrumb-item');
    let visible = 0;
    items.forEach((it: Element) => {
      if (!it.hasAttribute('data-hidden')) visible++;
    });
    expect(visible).toBe(6);
  });

  test('component is structurally rendered with expected class hierarchy', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('.kj-breadcrumb');
    const ol = nav.querySelector('.kj-breadcrumb-list');
    const firstItem = ol.querySelector('.kj-breadcrumb-item');
    const link = firstItem.querySelector('a.kj-breadcrumb-link');
    expect(link).not.toBeNull();
    expect(link.textContent.trim()).toBe('Home');
  });
});
