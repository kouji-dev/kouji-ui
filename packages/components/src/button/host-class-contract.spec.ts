import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KjAlertComponent, KjAlertDismissComponent } from '../alert/alert';
import { KjBadgeComponent } from '../badge/badge';
import { KjBreadcrumbLinkComponent } from '../breadcrumb/breadcrumb';
import { KjCardSubtitle, KjCardTitle } from '../card/card';
import { KjInputComponent } from '../input/input';
import {
  KjPaginationComponent,
  KjPaginationItemComponent,
} from '../pagination/pagination';
import { KjTabComponent, KjTabListComponent, KjTabsComponent } from '../tabs/tabs';
import { KjButtonComponent } from './button';

/**
 * cust F-5 / F-16 — "layer a single class on the host" is the project's own
 * documented escape hatch (`rules/code_style.md`), and it was inert for every
 * component whose host is `display: contents`: the class landed on an element
 * that paints nothing, and the only selector that reached the styled element
 * was `.my-class .kj-button` — exactly the internal-class override the rule
 * forbids. `kjClass` forwards the consumer's class onto the styled root, which
 * is what makes the rule true and what lets an unlayered consumer rule beat
 * a `[data-variant]` rule inside `@layer kj.component`.
 *
 * Every wrapper below is a `display: contents` host. A wrapper whose host *is*
 * the styled element (`kj-card`, `kj-alert`, `kj-spinner`, `kj-tabs`) needs no
 * `kjClass` — the consumer's class goes on the element as usual.
 */

@Component({
  standalone: true,
  imports: [
    KjButtonComponent,
    KjBadgeComponent,
    KjInputComponent,
    KjTabComponent,
    KjBreadcrumbLinkComponent,
    KjCardTitle,
    KjCardSubtitle,
    KjPaginationComponent,
    KjPaginationItemComponent,
    KjTabsComponent,
    KjTabListComponent,
    KjAlertComponent,
    KjAlertDismissComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjClass="mine" kjVariant="ghost">b</kj-button>
    <kj-badge kjClass="mine" variant="outline">n</kj-badge>
    <kj-input kjClass="mine" />
    <kj-tabs value="a">
      <kj-tab-list><kj-tab kjClass="mine" value="a">t</kj-tab></kj-tab-list>
    </kj-tabs>
    <kj-breadcrumb-link kjClass="mine" kjHref="/a">a</kj-breadcrumb-link>
    <kj-card-title kjClass="mine">t</kj-card-title>
    <kj-card-subtitle kjClass="mine">s</kj-card-subtitle>
    <kj-pagination [kjTotalPages]="3" [kjPage]="1">
      <kj-pagination-item kjClass="mine" [kjPage]="1">1</kj-pagination-item>
    </kj-pagination>
    <kj-alert>Saved<kj-alert-dismiss kjClass="mine" /></kj-alert>
  `,
})
class HostComponent {}

const CASES: ReadonlyArray<readonly [selector: string, styledRoot: string]> = [
  ['kj-button', '.kj-button'],
  ['kj-badge', '.kj-badge'],
  ['kj-input', '.kj-input'],
  ['kj-tab', '.kj-tab'],
  ['kj-breadcrumb-link', '.kj-breadcrumb-link'],
  ['kj-card-title', '.kj-card-title'],
  ['kj-card-subtitle', '.kj-card-subtitle'],
  ['kj-pagination-item', '.kj-pagination-item'],
  ['kj-alert-dismiss', '.kj-alert__dismiss'],
];

describe('kjClass lands on the styled root of every display:contents wrapper', () => {
  let root: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  for (const [selector, styledRoot] of CASES) {
    it(`${selector} forwards kjClass to ${styledRoot}`, () => {
      const wrapper = root.querySelector(selector)!;
      // The host itself is the display:contents wrapper — it must NOT be what
      // carries the class, otherwise the consumer is back to descendant
      // selectors.
      expect(wrapper.classList.contains('mine')).toBe(false);
      const styled = wrapper.querySelector(styledRoot)!;
      expect(styled, `${selector} has no ${styledRoot}`).toBeTruthy();
      expect(styled.classList.contains('mine')).toBe(true);
    });

    it(`${selector} keeps its own root class alongside kjClass`, () => {
      const styled = root.querySelector(`${selector} ${styledRoot}`)!;
      expect(styled.classList.contains(styledRoot.slice(1))).toBe(true);
    });
  }

  it('every kjClass host really is display:contents (the contract it documents)', () => {
    for (const [selector] of CASES) {
      const wrapper = root.querySelector(selector) as HTMLElement;
      expect(wrapper.style.display, `${selector} host`).toBe('contents');
    }
  });

  it('the class sits on the same element the variant rule targets', () => {
    // `.kj-button[data-variant="ghost"]` declares --kj-button-bg ON the
    // element, so an ancestor custom property cannot reach it (F-16). With
    // kjClass, the consumer's unlayered `.mine` rule declares on that very
    // element and wins on layer order regardless of specificity.
    const styled = root.querySelector('kj-button .kj-button')!;
    expect(styled.getAttribute('data-variant')).toBe('ghost');
    expect(styled.classList.contains('mine')).toBe(true);
  });
});
