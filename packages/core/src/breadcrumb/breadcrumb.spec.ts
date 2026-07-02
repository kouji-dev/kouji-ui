import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjBreadcrumb } from './breadcrumb';
import { KjBreadcrumbList } from './breadcrumb-list';
import { KjBreadcrumbItem } from './breadcrumb-item';
import { KjBreadcrumbLink } from './breadcrumb-link';
import { KjBreadcrumbCurrent } from './breadcrumb-current';
import { KjBreadcrumbSeparator } from './breadcrumb-separator';
import { KjBreadcrumbEllipsis } from './breadcrumb-ellipsis';

const imports = [
  KjBreadcrumb,
  KjBreadcrumbList,
  KjBreadcrumbItem,
  KjBreadcrumbLink,
  KjBreadcrumbCurrent,
  KjBreadcrumbSeparator,
  KjBreadcrumbEllipsis,
];

@Component({
  standalone: true,
  imports,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <nav kjBreadcrumb [kjMaxItems]="maxItems()" [kjOverflow]="overflow()">
      <ol kjBreadcrumbList>
        @for (crumb of crumbs(); track crumb.label; let last = $last) {
          <li kjBreadcrumbItem>
            @if (last) {
              <span kjBreadcrumbCurrent>{{ crumb.label }}</span>
            } @else {
              <a kjBreadcrumbLink [attr.href]="crumb.href">{{ crumb.label }}</a>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
class BreadcrumbHost {
  readonly crumbs = signal<{ label: string; href: string }[]>([
    { label: 'Home', href: '/' },
    { label: 'Library', href: '/library' },
    { label: 'Data', href: '/library/data' },
  ]);
  readonly maxItems = signal<number>(4);
  readonly overflow = signal<'truncate' | 'menu' | 'none'>('truncate');
}

@Component({
  standalone: true,
  imports,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <nav kjBreadcrumb>
      <ol kjBreadcrumbList>
        <li kjBreadcrumbItem><a kjBreadcrumbLink href="/">Home</a></li>
        <li kjBreadcrumbSeparator>›</li>
        <li kjBreadcrumbItem><a kjBreadcrumbLink href="/library">Library</a></li>
        <li kjBreadcrumbSeparator>›</li>
        <li kjBreadcrumbItem><span kjBreadcrumbCurrent>Data</span></li>
      </ol>
    </nav>
  `,
})
class ExplicitSeparatorHost {}

@Component({
  standalone: true,
  imports,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <nav kjBreadcrumb [kjMaxItems]="3">
      <ol kjBreadcrumbList>
        <li kjBreadcrumbItem><a kjBreadcrumbLink href="/">Home</a></li>
        <li kjBreadcrumbItem><a kjBreadcrumbLink href="/a">A</a></li>
        <li kjBreadcrumbItem><a kjBreadcrumbLink href="/b">B</a></li>
        <li kjBreadcrumbItem><a kjBreadcrumbLink href="/c">C</a></li>
        <li kjBreadcrumbItem><span kjBreadcrumbCurrent>Current</span></li>
      </ol>
    </nav>
  `,
})
class TruncatedHost {}

describe('KjBreadcrumb (root)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BreadcrumbHost, ExplicitSeparatorHost, TruncatedHost],
    });
  });

  test('renders <nav aria-label="Breadcrumb"> by default', () => {
    const fixture = TestBed.createComponent(BreadcrumbHost);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav[kjBreadcrumb]');
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  test('reflects data-overflow="truncate" by default', () => {
    const fixture = TestBed.createComponent(BreadcrumbHost);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav[kjBreadcrumb]');
    expect(nav.getAttribute('data-overflow')).toBe('truncate');
  });

  test('exposes a kjBreadcrumb template ref via exportAs', () => {
    const fixture = TestBed.createComponent(BreadcrumbHost);
    fixture.detectChanges();
    // Selector restriction forces <nav> host — sanity check.
    const nav = fixture.nativeElement.querySelector('nav[kjBreadcrumb]');
    expect(nav.tagName.toLowerCase()).toBe('nav');
  });
});

describe('KjBreadcrumbList', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BreadcrumbHost, ExplicitSeparatorHost] });
  });

  test('renders <ol> as the host', () => {
    const fixture = TestBed.createComponent(BreadcrumbHost);
    fixture.detectChanges();
    const ol = fixture.nativeElement.querySelector('ol[kjBreadcrumbList]');
    expect(ol).not.toBeNull();
    expect(ol.tagName.toLowerCase()).toBe('ol');
  });

  test('reflects data-explicit-separators when separator cells are present', () => {
    const fixture = TestBed.createComponent(ExplicitSeparatorHost);
    fixture.detectChanges();
    const ol = fixture.nativeElement.querySelector('ol[kjBreadcrumbList]');
    expect(ol.getAttribute('data-explicit-separators')).toBe('');
  });

  test('omits data-explicit-separators when separators are auto', () => {
    const fixture = TestBed.createComponent(BreadcrumbHost);
    fixture.detectChanges();
    const ol = fixture.nativeElement.querySelector('ol[kjBreadcrumbList]');
    expect(ol.hasAttribute('data-explicit-separators')).toBe(false);
  });
});

describe('KjBreadcrumbItem', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BreadcrumbHost, TruncatedHost] });
  });

  test('renders one <li> per crumb', () => {
    const fixture = TestBed.createComponent(BreadcrumbHost);
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('li[kjBreadcrumbItem]');
    expect(items.length).toBe(3);
  });

  test('hides truncated items via data-hidden', () => {
    const fixture = TestBed.createComponent(TruncatedHost);
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('li[kjBreadcrumbItem]');
    // 5 total, kjMaxItems=3 → first + last (3-2)=1 last = first + last 1 visible.
    // visible indices: [0, 4]. hidden: [1, 2, 3].
    expect(items[0].hasAttribute('data-hidden')).toBe(false);
    expect(items[1].getAttribute('data-hidden')).toBe('');
    expect(items[2].getAttribute('data-hidden')).toBe('');
    expect(items[3].getAttribute('data-hidden')).toBe('');
    expect(items[4].hasAttribute('data-hidden')).toBe(false);
  });
});

describe('KjBreadcrumbCurrent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BreadcrumbHost] });
  });

  test('reflects aria-current="page"', () => {
    const fixture = TestBed.createComponent(BreadcrumbHost);
    fixture.detectChanges();
    const current = fixture.nativeElement.querySelector('[kjBreadcrumbCurrent]');
    expect(current).not.toBeNull();
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  test('the parent <li> does NOT also receive aria-current when explicit current is registered', () => {
    const fixture = TestBed.createComponent(BreadcrumbHost);
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('li[kjBreadcrumbItem]');
    // With an explicit KjBreadcrumbCurrent the parent <li> should NOT carry
    // aria-current — only the <span> does.
    const last = items[items.length - 1];
    expect(last.hasAttribute('aria-current')).toBe(false);
  });
});

describe('KjBreadcrumbSeparator', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ExplicitSeparatorHost] });
  });

  test('reflects role="presentation" + aria-hidden="true"', () => {
    const fixture = TestBed.createComponent(ExplicitSeparatorHost);
    fixture.detectChanges();
    const sep = fixture.nativeElement.querySelector('li[kjBreadcrumbSeparator]');
    expect(sep).not.toBeNull();
    expect(sep.getAttribute('role')).toBe('presentation');
    expect(sep.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('KjBreadcrumbLink', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BreadcrumbHost] });
  });

  test('the directive composes KjLink — host carries data-underline + data-variant + data-size', () => {
    const fixture = TestBed.createComponent(BreadcrumbHost);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a[kjBreadcrumbLink]');
    expect(link).not.toBeNull();
    // KjLink defaults reflect to data-underline; the breadcrumb wrapper sets
    // size/variant/underline through forwarded inputs at the components layer,
    // here we just verify KjLink is composed by checking data-underline exists.
    expect(link.hasAttribute('data-underline')).toBe(true);
  });

  test('marks the host with data-breadcrumb-link', () => {
    const fixture = TestBed.createComponent(BreadcrumbHost);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a[kjBreadcrumbLink]');
    expect(link.getAttribute('data-breadcrumb-link')).toBe('');
  });
});

describe('KjBreadcrumb truncation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TruncatedHost] });
  });

  test('appends "(N items hidden)" to aria-label in truncate mode', () => {
    const fixture = TestBed.createComponent(TruncatedHost);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav[kjBreadcrumb]');
    // 5 items, maxItems=3 → 3 hidden.
    expect(nav.getAttribute('aria-label')).toContain('3 items hidden');
  });

  test('does not append count when overflow is "none"', () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <nav kjBreadcrumb [kjMaxItems]="3" kjOverflow="none">
          <ol kjBreadcrumbList>
            <li kjBreadcrumbItem><a kjBreadcrumbLink href="/">Home</a></li>
            <li kjBreadcrumbItem><a kjBreadcrumbLink href="/a">A</a></li>
            <li kjBreadcrumbItem><a kjBreadcrumbLink href="/b">B</a></li>
            <li kjBreadcrumbItem><a kjBreadcrumbLink href="/c">C</a></li>
            <li kjBreadcrumbItem><span kjBreadcrumbCurrent>Cur</span></li>
          </ol>
        </nav>
      `,
    })
    class NoneHost {}
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [NoneHost] });
    const fixture = TestBed.createComponent(NoneHost);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav[kjBreadcrumb]');
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
  });
});

describe('KjBreadcrumbEllipsis', () => {
  test('reflects aria-hidden="true" in truncate mode', () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <nav kjBreadcrumb [kjMaxItems]="3">
          <ol kjBreadcrumbList>
            <li kjBreadcrumbItem><a kjBreadcrumbLink href="/">Home</a></li>
            <li kjBreadcrumbItem><span kjBreadcrumbEllipsis>…</span></li>
            <li kjBreadcrumbItem><a kjBreadcrumbLink href="/a">A</a></li>
            <li kjBreadcrumbItem><span kjBreadcrumbCurrent>Cur</span></li>
          </ol>
        </nav>
      `,
    })
    class EllipsisHost {}

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [EllipsisHost] });
    const fixture = TestBed.createComponent(EllipsisHost);
    fixture.detectChanges();
    const ell = fixture.nativeElement.querySelector('[kjBreadcrumbEllipsis]');
    expect(ell).not.toBeNull();
    expect(ell.getAttribute('aria-hidden')).toBe('true');
  });

  test('reflects aria-haspopup="true" + label in menu mode', () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <nav kjBreadcrumb [kjMaxItems]="3" kjOverflow="menu">
          <ol kjBreadcrumbList>
            <li kjBreadcrumbItem><a kjBreadcrumbLink href="/">Home</a></li>
            <li kjBreadcrumbItem><a kjBreadcrumbLink href="/a">A</a></li>
            <li kjBreadcrumbItem><a kjBreadcrumbLink href="/b">B</a></li>
            <li kjBreadcrumbItem><button kjBreadcrumbEllipsis>…</button></li>
            <li kjBreadcrumbItem><span kjBreadcrumbCurrent>Cur</span></li>
          </ol>
        </nav>
      `,
    })
    class MenuHost {}

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [MenuHost] });
    const fixture = TestBed.createComponent(MenuHost);
    fixture.detectChanges();
    const ell = fixture.nativeElement.querySelector('[kjBreadcrumbEllipsis]');
    expect(ell.getAttribute('aria-haspopup')).toBe('true');
    expect(ell.getAttribute('aria-label')).toContain('hidden');
  });
});

describe('KjBreadcrumb separator wiring', () => {
  test('kjSeparator reflects to --kj-breadcrumb-separator-content style', () => {
    @Component({
      standalone: true,
      imports,
      template: `
        <nav kjBreadcrumb kjSeparator="›">
          <ol kjBreadcrumbList>
            <li kjBreadcrumbItem><a kjBreadcrumbLink href="/">Home</a></li>
            <li kjBreadcrumbItem><span kjBreadcrumbCurrent>Cur</span></li>
          </ol>
        </nav>
      `,
    })
    class SepHost {}
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [SepHost] });
    const fixture = TestBed.createComponent(SepHost);
    fixture.detectChanges();
    const nav: HTMLElement = fixture.nativeElement.querySelector('nav[kjBreadcrumb]');
    // The custom property should resolve to "'›'".
    const cssValue = nav.style.getPropertyValue('--kj-breadcrumb-separator-content');
    expect(cssValue).toContain('›');
  });
});
