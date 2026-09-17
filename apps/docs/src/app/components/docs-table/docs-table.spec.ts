import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { DocsTableComponent } from './docs-table';

/**
 * The headless-table demo on every docs page. It is the reference shape for
 * `<button kjTableSort>` (accessibility review F-13): the button is the Tab
 * stop and carries the column label as its accessible name, while the `<th>`
 * keeps `aria-sort` and stays out of the Tab order. The legacy focusable-`<th>`
 * mode announces a column header with no action name.
 */
describe('DocsTableComponent', () => {
  function mount() {
    const fixture = TestBed.createComponent(DocsTableComponent);
    fixture.componentRef.setInput('columns', [
      { key: 'name', header: 'Name' },
      { key: 'type', header: 'Type' },
    ]);
    fixture.componentRef.setInput('rows', [
      { name: 'beta', type: 'string' },
      { name: 'alpha', type: 'number' },
    ]);
    fixture.componentRef.setInput('label', 'Inputs');
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  test('each header cell owns a sort button named after the column', () => {
    const fixture = mount();
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('th button[kjTableSort]') as NodeListOf<HTMLElement>,
    );
    expect(buttons.length).toBe(2);
    expect(buttons.map(b => b.textContent?.trim())).toEqual(['Name', 'Type']);
    expect(buttons[0].getAttribute('type')).toBe('button');
  });

  /** WCAG 2.4.3 — one Tab stop per column, on the control, not the cell. */
  test('the th is not a Tab stop while the sort button is present', () => {
    const fixture = mount();
    const th = fixture.nativeElement.querySelector('th') as HTMLElement;
    expect(th.hasAttribute('tabindex')).toBe(false);
    expect(th.getAttribute('aria-sort')).toBe('none');
  });

  test('activating the button sorts the column and updates aria-sort', () => {
    const fixture = mount();
    const button = fixture.nativeElement.querySelector('th button[kjTableSort]') as HTMLElement;
    const th = button.closest('th') as HTMLElement;

    button.click();
    fixture.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    const firstCell = fixture.nativeElement.querySelector('tbody td');
    expect(firstCell.textContent?.trim()).toBe('alpha');

    button.click();
    fixture.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('descending');
  });

  test('Enter on the focused button sorts the column', () => {
    const fixture = mount();
    const button = fixture.nativeElement.querySelector('th button[kjTableSort]') as HTMLElement;
    const th = button.closest('th') as HTMLElement;

    button.focus();
    expect(document.activeElement).toBe(button);
    // Enter on a native <button> dispatches a click; that is the contract.
    (document.activeElement as HTMLElement).click();
    fixture.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('ascending');
  });

  /**
   * WCAG 2.5.5 Target Size, asserted against the stylesheet because jsdom has
   * no layout. The label is 0.65rem, so with the padding on the `<th>` the
   * button's box was the text line — roughly 15px tall — even though the cell
   * around it looked generous. The padding has to sit on the control, and the
   * control needs the 2.75rem floor the library applies to its own rows.
   */
  test('the sort button, not the header cell, owns the hit area', () => {
    const css = readFileSync(resolve(__dirname, 'docs-table.css'), 'utf8');

    const th = css.match(/^th \{([^}]*)\}/m)?.[1] ?? '';
    expect(th, 'the th rule was not found').not.toBe('');
    expect(th, 'th still declares its own padding').toMatch(/padding:\s*0\s*;/);

    const button = css.match(/^\.docs-table__sort \{([^}]*)\}/m)?.[1] ?? '';
    expect(button, 'the sort-button rule was not found').not.toBe('');
    expect(button).toMatch(/min-height:\s*2\.75rem/);
    expect(button).toMatch(/padding:\s*var\(--kj-space-md\)\s+var\(--kj-space-lg\)/);
  });

  test('renders an empty state when there are no rows', () => {
    const fixture = TestBed.createComponent(DocsTableComponent);
    fixture.componentRef.setInput('columns', [{ key: 'name', header: 'Name' }]);
    fixture.componentRef.setInput('rows', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
  });
});
