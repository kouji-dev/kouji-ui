import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  KjMultiSelectComponent,
  KjMultiSelectOptionComponent,
} from './multi-select';

@Component({
  standalone: true,
  imports: [KjMultiSelectComponent, KjMultiSelectOptionComponent],
  template: `
    <kj-multi-select
      [(value)]="picked"
      [max]="max"
      [maxChips]="maxChips"
      [placeholder]="placeholder"
    >
      <kj-multi-select-option [value]="'a'">Apple</kj-multi-select-option>
      <kj-multi-select-option [value]="'b'">Banana</kj-multi-select-option>
      <kj-multi-select-option [value]="'c'">Cherry</kj-multi-select-option>
    </kj-multi-select>
  `,
})
class Host {
  picked = signal<string[]>([]);
  max = Infinity;
  maxChips = 3;
  placeholder = 'Choose…';
}

describe('KjMultiSelectComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Host] });
  });

  test('renders placeholder when no values are selected', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const placeholder = fixture.nativeElement.querySelector(
      '.kj-multi-select-placeholder',
    );
    expect(placeholder?.textContent?.trim()).toBe('Choose…');
  });

  test('trigger has role=combobox + aria-haspopup=listbox', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector(
      '.kj-multi-select-trigger',
    );
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
  });

  test('listbox has role=listbox + aria-multiselectable=true and is hidden by default', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const listbox = fixture.nativeElement.querySelector(
      '.kj-multi-select-listbox',
    );
    expect(listbox.getAttribute('role')).toBe('listbox');
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
    expect(listbox.hasAttribute('hidden')).toBe(true);
  });

  test('clicking the trigger opens the listbox', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector(
      '.kj-multi-select-trigger',
    ) as HTMLElement;
    trigger.click();
    fixture.detectChanges();
    const listbox = fixture.nativeElement.querySelector(
      '.kj-multi-select-listbox',
    );
    expect(listbox.hasAttribute('hidden')).toBe(false);
  });

  test('clicking an option toggles its membership in [(value)]', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector(
      '.kj-multi-select-trigger',
    ) as HTMLElement).click();
    fixture.detectChanges();
    const option = fixture.nativeElement.querySelector(
      '.kj-multi-select-option',
    ) as HTMLElement;
    option.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.picked()).toEqual(['a']);

    // Listbox stays open
    const listbox = fixture.nativeElement.querySelector(
      '.kj-multi-select-listbox',
    );
    expect(listbox.hasAttribute('hidden')).toBe(false);
  });

  test('selected values render as chips inside the trigger', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.picked.set(['a', 'b']);
    fixture.detectChanges();
    const chips = fixture.nativeElement.querySelectorAll(
      '.kj-multi-select-trigger kj-tag',
    );
    expect(chips.length).toBe(2);
  });

  test('overflow chip appears past maxChips threshold', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.maxChips = 1;
    fixture.componentInstance.picked.set(['a', 'b', 'c']);
    fixture.detectChanges();
    const overflow = fixture.nativeElement.querySelector(
      '.kj-multi-select-overflow',
    );
    expect(overflow).not.toBeNull();
    expect(overflow!.textContent).toContain('+2 more');
  });

  test('removing a chip via its × button drops the value', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.picked.set(['a', 'b']);
    fixture.detectChanges();
    const remove = fixture.nativeElement.querySelector(
      '.kj-multi-select-trigger kj-tag-remove',
    ) as HTMLElement;
    remove.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.picked()).toEqual(['b']);
  });

  test('respects [max] cap (third click is dropped)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.max = 2;
    fixture.detectChanges();
    (fixture.nativeElement.querySelector(
      '.kj-multi-select-trigger',
    ) as HTMLElement).click();
    fixture.detectChanges();
    const opts = fixture.nativeElement.querySelectorAll(
      '.kj-multi-select-option',
    ) as NodeListOf<HTMLElement>;
    opts[0].click();
    opts[1].click();
    opts[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.picked()).toEqual(['a', 'b']);
  });

  test('options carry role="option" and reflect aria-selected', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.picked.set(['b']);
    fixture.detectChanges();
    const opts = fixture.nativeElement.querySelectorAll(
      '.kj-multi-select-option',
    );
    expect(opts[0].getAttribute('role')).toBe('option');
    expect(opts[0].getAttribute('aria-selected')).toBe('false');
    expect(opts[1].getAttribute('aria-selected')).toBe('true');
  });
});
