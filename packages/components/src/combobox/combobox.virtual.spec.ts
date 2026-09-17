import { ApplicationRef, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KjComboboxComponent, KjComboboxEmpty } from './combobox';

interface Country {
  readonly code: string;
  readonly label: string;
  readonly disabled?: boolean;
}

const COUNTRIES: readonly Country[] = Array.from({ length: 5000 }, (_, i) => ({
  code: `c-${i}`,
  label: `Country ${i}`,
}));

@Component({
  standalone: true,
  imports: [KjComboboxComponent, KjComboboxEmpty],
  template: `
    <kj-combobox
      [(value)]="value"
      [options]="options()"
      [virtual]="virtual()"
      [virtualItemSize]="32"
      [optionValue]="byCode"
      [optionLabel]="byLabel"
    >
      <kj-combobox-empty>No match.</kj-combobox-empty>
    </kj-combobox>
  `,
})
class Host {
  readonly value = signal<unknown>(null);
  readonly options = signal<readonly Country[]>(COUNTRIES);
  readonly virtual = signal(true);
  readonly byCode = (item: unknown): unknown => (item as Country).code;
  readonly byLabel = (item: unknown): string => (item as Country).label;
}

describe('<kj-combobox [virtual]> — windowed listbox (perf F-4)', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let appRef: ApplicationRef;

  const settle = (times = 3): void => {
    for (let i = 0; i < times; i++) {
      fixture.detectChanges();
      appRef.tick();
    }
  };

  // The listbox is portalled into `.kj-overlay-container` on <body> once
  // open, so every row query goes through the document.
  const input = (): HTMLInputElement =>
    fixture.nativeElement.querySelector('input.kj-combobox-input') as HTMLInputElement;
  const listbox = (): HTMLElement =>
    document.querySelector<HTMLElement>('.kj-combobox-listbox')!;
  const rows = (): HTMLElement[] =>
    [...listbox().querySelectorAll<HTMLElement>('.kj-combobox-option')];
  const labels = (): string[] => rows().map(r => r.textContent!.trim());
  const activeRow = (): HTMLElement | null => {
    const id = input().getAttribute('aria-activedescendant');
    return id ? document.getElementById(id) : null;
  };
  const type = (text: string): void => {
    input().value = text;
    input().dispatchEvent(new Event('input', { bubbles: true }));
    settle();
  };
  const press = (key: string): void => {
    input().dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
    settle();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    appRef = TestBed.inject(ApplicationRef);
    settle();
    // Open the way a user does: focus the input, then click it.
    input().focus();
    settle();
    input().click();
    settle();
    expect(listbox().hasAttribute('hidden'), 'the listbox is open').toBe(false);
  });

  afterEach(() => {
    fixture.destroy();
    document.querySelectorAll('.kj-overlay-wrapper, .kj-overlay-container').forEach(n => n.remove());
  });

  it('renders a bounded window for 5 000 options instead of one row each', () => {
    const n = rows().length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(100);
    const box = listbox().querySelector('.kj-combobox-virtual') as HTMLElement;
    expect(parseInt(box.style.height, 10)).toBe(5000 * 32);
  });

  it('ArrowDown walks past the end of the window and keeps the active option rendered', () => {
    const windowEnd = rows().length;
    for (let i = 0; i < windowEnd + 5; i++) press('ArrowDown');

    const active = activeRow();
    expect(active, 'aria-activedescendant always points at a rendered option').not.toBeNull();
    expect(active!.textContent!.trim()).toBe(`Country ${windowEnd + 5}`);
    expect(rows().length).toBeLessThan(100);
  });

  it('End reaches the last option in the dataset and Enter commits it', () => {
    press('End');
    expect(activeRow()?.textContent?.trim()).toBe('Country 4999');
    press('Enter');
    expect(fixture.componentInstance.value()).toBe('c-4999');
    expect(input().value).toBe('Country 4999');
  });

  it('reports the option-list position, not the window position, through ARIA', () => {
    press('End');
    const active = activeRow()!;
    expect(active.getAttribute('aria-setsize')).toBe('5000');
    expect(active.getAttribute('aria-posinset')).toBe('5000');
  });

  it('filters the option data and restarts the cursor on the first match', () => {
    type('Country 4321');
    expect(labels()).toEqual(['Country 4321']);
    expect(activeRow()?.textContent?.trim()).toBe('Country 4321');
  });

  it('shows the empty slot when nothing in the dataset matches', () => {
    type('zzz-nothing');
    expect(rows()).toHaveLength(0);
    expect(document.querySelector('.kj-combobox-empty')!.hasAttribute('hidden')).toBe(false);
  });

  it('skips a disabled option when the cursor moves over it', () => {
    fixture.componentInstance.options.set([
      { code: 'a', label: 'Alpha' },
      { code: 'b', label: 'Bravo', disabled: true },
      { code: 'c', label: 'Charlie' },
    ]);
    settle();
    press('ArrowDown');
    expect(activeRow()?.textContent?.trim()).toBe('Charlie');
  });

  it('renders every option again when [virtual] is off', () => {
    fixture.componentInstance.options.set(COUNTRIES.slice(0, 40));
    fixture.componentInstance.virtual.set(false);
    settle();
    expect(rows()).toHaveLength(40);
    expect(listbox().querySelector('.kj-combobox-virtual')).toBeNull();
  });
});
