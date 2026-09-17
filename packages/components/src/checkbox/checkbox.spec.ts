import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KjCheckboxComponent } from './checkbox';

/**
 * Behavioural cover for the styled `<kj-checkbox>` wrapper: what it renders,
 * the label-click forwarding it owns (the headless directive only sees the
 * box), the keyboard toggle, and the ARIA shape its `@doc-aria` block
 * promises.
 */

@Component({
  standalone: true,
  imports: [KjCheckboxComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-checkbox
      [(checked)]="accepted"
      [disabled]="disabled()"
      [indeterminate]="indeterminate()"
      [size]="size()"
      >Accept terms</kj-checkbox
    >
  `,
})
class Host {
  readonly accepted = signal(false);
  readonly disabled = signal(false);
  readonly indeterminate = signal(false);
  readonly size = signal<'sm' | 'md' | 'lg'>('md');
}

function mount(): { fixture: ReturnType<typeof TestBed.createComponent<Host>>; root: HTMLElement } {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

function box(root: HTMLElement): HTMLElement {
  const el = root.querySelector<HTMLElement>('.kj-checkbox-box');
  if (!el) throw new Error('checkbox box not rendered');
  return el;
}

describe('KjCheckboxComponent', () => {
  it('renders the box and the projected label inside the click region', () => {
    const { root } = mount();

    expect(root.querySelector('kj-checkbox')?.classList.contains('kj-checkbox')).toBe(true);
    expect(root.querySelector('.kj-checkbox-inner')).not.toBeNull();
    expect(root.querySelector('.kj-checkbox-label')?.textContent?.trim()).toBe('Accept terms');
    expect(box(root).getAttribute('data-size')).toBe('md');
  });

  it('exposes role="checkbox", aria-checked and a programmatic name from the label', () => {
    const { root } = mount();
    const el = box(root);

    expect(el.getAttribute('role')).toBe('checkbox');
    expect(el.getAttribute('aria-checked')).toBe('false');

    const labelId = el.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(root.querySelector(`#${labelId}`)?.textContent?.trim()).toBe('Accept terms');
  });

  it('clicking the label text toggles the box (the wrapper forwards the click)', () => {
    const { fixture, root } = mount();

    (root.querySelector('.kj-checkbox-label') as HTMLElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.accepted()).toBe(true);
    expect(box(root).getAttribute('aria-checked')).toBe('true');
    expect(box(root).getAttribute('data-checked')).toBe('');
  });

  it('clicking the box itself toggles exactly once — the forwarder must not double-fire', () => {
    const { fixture, root } = mount();

    box(root).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.accepted()).toBe(true);
  });

  it('Space on the focused box toggles it', () => {
    const { fixture, root } = mount();

    box(root).focus();
    expect(document.activeElement).toBe(box(root));
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.accepted()).toBe(true);
  });

  it('disabled reflects aria-disabled on the box and data-disabled on the host, and swallows label clicks', () => {
    const { fixture, root } = mount();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(box(root).getAttribute('aria-disabled')).toBe('true');
    expect(root.querySelector('kj-checkbox')?.getAttribute('data-disabled')).toBe('');

    (root.querySelector('.kj-checkbox-label') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.accepted()).toBe(false);
  });

  it('indeterminate marks the box and announces the mixed state', () => {
    const { fixture, root } = mount();
    fixture.componentInstance.indeterminate.set(true);
    fixture.detectChanges();

    // The dash glyph and the announced state come from one signal on the
    // headless `KjCheckbox`, so they cannot disagree — the @doc-aria block's
    // `aria-checked="mixed"` promise is real (WCAG 1.3.1 / 4.1.2).
    expect(box(root).getAttribute('data-indeterminate')).toBe('');
    expect(box(root).getAttribute('aria-checked')).toBe('mixed');
  });

  it('size lands on the box as a data attribute', () => {
    const { fixture, root } = mount();
    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();

    expect(box(root).getAttribute('data-size')).toBe('lg');
  });
});

describe('KjCheckboxComponent — tabindex', () => {
  // A selectable grid renders one checkbox per row. Each one being its own Tab
  // stop means 50 rows add 50 stops before the user reaches the next control
  // (WCAG 2.4.3 Focus Order); a `role="grid"` owns arrow-key navigation and
  // must present a single stop. The box stays focusable by script/pointer at
  // -1, so the grid can still move focus onto it.
  @Component({
    standalone: true,
    imports: [KjCheckboxComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<kj-checkbox [tabindex]="tabindex()">Select row</kj-checkbox>`,
  })
  class TabindexHost {
    readonly tabindex = signal(0);
  }

  function mountTabindex() {
    TestBed.configureTestingModule({ imports: [TabindexHost] });
    const fixture = TestBed.createComponent(TabindexHost);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('defaults to 0 — the checkbox is its own Tab stop', () => {
    const { root } = mountTabindex();
    expect(box(root).getAttribute('tabindex')).toBe('0');
  });

  it('accepts -1 so a grid row checkbox leaves the Tab order', () => {
    const { fixture, root } = mountTabindex();
    fixture.componentInstance.tabindex.set(-1);
    fixture.detectChanges();
    expect(box(root).getAttribute('tabindex')).toBe('-1');
  });

  it('stays focusable by script at -1 (the grid moves focus onto it)', () => {
    const { fixture, root } = mountTabindex();
    fixture.componentInstance.tabindex.set(-1);
    fixture.detectChanges();
    const el = box(root);
    el.focus();
    expect(document.activeElement).toBe(el);
  });

  it('keeps role="checkbox" and the accessible name at -1', () => {
    const { fixture, root } = mountTabindex();
    fixture.componentInstance.tabindex.set(-1);
    fixture.detectChanges();
    const el = box(root);
    expect(el.getAttribute('role')).toBe('checkbox');
    expect(el.getAttribute('aria-labelledby')).toBeTruthy();
  });
});

/** arch F-2 — `disabled` / `indeterminate` accept the bare-attribute form. */
describe('kj-checkbox bare boolean attributes', () => {
  @Component({
    standalone: true,
    imports: [KjCheckboxComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<kj-checkbox disabled indeterminate>Label</kj-checkbox>`,
  })
  class BareHost {}

  it('reads bare `disabled` and `indeterminate` as true', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [BareHost] });
    const fixture = TestBed.createComponent(BareHost);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement.querySelector('kj-checkbox');
    const box = host.querySelector('.kj-checkbox-box')!;
    expect(host.hasAttribute('data-disabled')).toBe(true);
    expect(box.getAttribute('aria-disabled')).toBe('true');
    expect(box.getAttribute('aria-checked')).toBe('mixed');
  });
});
