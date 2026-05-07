import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  KjTagComponent,
  KjTagListComponent,
  KjTagRemoveComponent,
} from './tag';

@Component({
  standalone: true,
  imports: [KjTagComponent, KjTagRemoveComponent],
  template: `
    <kj-tag
      [kjTagDisabled]="disabled"
      [kjTagSelectable]="selectable"
      [(kjTagSelected)]="selected"
    >{{ label }}<kj-tag-remove [kjTagRemoveLabel]="removeLabel">×</kj-tag-remove></kj-tag>
  `,
})
class TagHost {
  disabled = false;
  selectable = false;
  selected = signal(false);
  label = 'Acme';
  removeLabel: string | undefined = undefined;
}

@Component({
  standalone: true,
  imports: [KjTagComponent, KjTagListComponent],
  template: `
    <kj-tag-list
      [kjTagListRole]="role"
      [kjTagListMultiple]="multiple"
      [kjTagListDisabled]="listDisabled"
      aria-label="Filters"
    >
      <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="one">One</kj-tag>
      <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="two">Two</kj-tag>
    </kj-tag-list>
  `,
})
class ListHost {
  role: 'listbox' | 'grid' | 'group' = 'listbox';
  multiple = true;
  listDisabled = false;
  one = signal(false);
  two = signal(true);
}

describe('KjTagComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TagHost, ListHost] });
  });

  test('renders the projected text inside <kj-tag>', () => {
    const fixture = TestBed.createComponent(TagHost);
    fixture.detectChanges();
    const tag = fixture.nativeElement.querySelector('kj-tag.kj-tag');
    expect(tag).not.toBeNull();
    expect(tag.textContent).toContain('Acme');
  });

  test('selectable mode sets role="button" and aria-pressed', () => {
    const fixture = TestBed.createComponent(TagHost);
    fixture.componentInstance.selectable = true;
    fixture.detectChanges();
    const tag = fixture.nativeElement.querySelector('kj-tag');
    expect(tag.getAttribute('role')).toBe('button');
    expect(tag.getAttribute('tabindex')).toBe('0');
    expect(tag.getAttribute('aria-pressed')).toBe('false');
  });

  test('selectable click toggles two-way bound kjTagSelected', () => {
    const fixture = TestBed.createComponent(TagHost);
    fixture.componentInstance.selectable = true;
    fixture.detectChanges();
    const tag = fixture.nativeElement.querySelector('kj-tag') as HTMLElement;
    tag.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()).toBe(true);
    expect(tag.getAttribute('aria-pressed')).toBe('true');
  });

  test('forwards kjTagDisabled (aria-disabled attr)', () => {
    const fixture = TestBed.createComponent(TagHost);
    fixture.componentInstance.disabled = true;
    fixture.componentInstance.selectable = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-tag').getAttribute('aria-disabled'))
      .toBe('true');
  });
});

describe('KjTagRemoveComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TagHost] });
  });

  test('renders the kj-tag-remove host with an accessible name from the parent label', () => {
    const fixture = TestBed.createComponent(TagHost);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('kj-tag-remove.kj-tag-remove');
    expect(btn).not.toBeNull();
    // KjTagRemove's host bindings inject the auto-derived "Remove Acme" label.
    expect(btn.getAttribute('aria-label')).toMatch(/^Remove\s+Acme/);
  });

  test('respects kjTagRemoveLabel override on aria-label', () => {
    const fixture = TestBed.createComponent(TagHost);
    fixture.componentInstance.removeLabel = 'Dismiss filter';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-tag-remove').getAttribute('aria-label'))
      .toBe('Dismiss filter');
  });
});

describe('KjTagListComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ListHost] });
  });

  test('propagates listbox role onto the host and into chips', () => {
    const fixture = TestBed.createComponent(ListHost);
    fixture.detectChanges();
    const list = fixture.nativeElement.querySelector('kj-tag-list.kj-tag-list');
    expect(list.getAttribute('role')).toBe('listbox');
    expect(list.getAttribute('aria-multiselectable')).toBe('true');
    const chips = fixture.nativeElement.querySelectorAll('kj-tag');
    expect(chips[0].getAttribute('role')).toBe('option');
    expect(chips[1].getAttribute('role')).toBe('option');
    expect(chips[1].getAttribute('aria-selected')).toBe('true');
  });

  test('group role does not force a chip role from the container', () => {
    const fixture = TestBed.createComponent(ListHost);
    fixture.componentInstance.role = 'group';
    fixture.componentInstance.multiple = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-tag-list').getAttribute('role')).toBe('group');
    const chip = fixture.nativeElement.querySelector('kj-tag');
    // Selectable still sets role=button when not under listbox/grid.
    expect(chip.getAttribute('role')).toBe('button');
  });

  test('cascades kjTagListDisabled into nested chips', () => {
    const fixture = TestBed.createComponent(ListHost);
    fixture.componentInstance.listDisabled = true;
    fixture.detectChanges();
    const chips = fixture.nativeElement.querySelectorAll('kj-tag');
    expect(chips[0].getAttribute('aria-disabled')).toBe('true');
    expect(chips[1].getAttribute('aria-disabled')).toBe('true');
  });
});
