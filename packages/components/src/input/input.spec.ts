import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjInputComponent } from './input';

@Component({
  standalone: true,
  imports: [KjInputComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-input
    [type]="type"
    [value]="value"
    [placeholder]="placeholder"
    [invalid]="invalid"
    [disabled]="disabled"
    [autocomplete]="autocomplete"
    [inputmode]="inputmode"
  />`,
})
class HostComponent {
  type: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' | 'color' = 'text';
  value = '';
  placeholder = '';
  invalid = false;
  disabled = false;
  autocomplete = '';
  inputmode = '';
}

describe('KjInputComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <input> with the .kj-input class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input.kj-input')).not.toBeNull();
  });

  test('forwards type to the inner element', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type = 'email';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').getAttribute('type')).toBe(
      'email',
    );
  });

  test('renders <input type="color"> when type=color', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type = 'color';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').getAttribute('type')).toBe(
      'color',
    );
  });

  test('mirrors type to data-type attr on host', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.type = 'color';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input').getAttribute('data-type')).toBe('color');
  });

  test('forwards value to the inner element (no form control wired)', () => {
    // Use type=text — jsdom's <input type="color"> .value reverts to '#000000'.
    // The binding mechanism is identical for any type.
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value = 'hello';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').value).toBe('hello');
  });

  test('forwards placeholder', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.placeholder = 'you@example.com';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-input input').getAttribute('placeholder')).toBe(
      'you@example.com',
    );
  });

  test('forwards invalid → aria-invalid (after blur)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.invalid = true;
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-input input');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  test('forwards disabled → aria-disabled', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('kj-input input').getAttribute('aria-disabled'),
    ).toBe('true');
  });

  test('omits autocomplete and inputmode when empty', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-input input');
    expect(input.getAttribute('autocomplete')).toBeNull();
    expect(input.getAttribute('inputmode')).toBeNull();
  });

  test('forwards autocomplete and inputmode to the inner element', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.autocomplete = 'username';
    fixture.componentInstance.inputmode = 'numeric';
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('kj-input input');
    expect(input.getAttribute('autocomplete')).toBe('username');
    expect(input.getAttribute('inputmode')).toBe('numeric');
  });
});

describe('KjInputComponent — naming convention + accessible name', () => {
  // cust F-12 / arch F-7: `kj-input` was the one element component in the
  // package that mixed the two conventions in a single class — `variant`,
  // `value`, `invalid`, `disabled` bare, `kjSize` prefixed. `<kj-*>` element
  // components take bare names (rules/code_style.md). arch F-11: the `kjSize`
  // alias the first pass kept was deleted — the library ships one name per
  // symbol, so an unknown `kjSize` attribute is now inert.
  @Component({
    standalone: true,
    imports: [KjInputComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
      <kj-input id="bare" size="lg" />
      <kj-input id="alias" size="sm" />
      <kj-input id="neither" />
      <kj-input id="named" ariaLabel="Filter by name" />
    `,
  })
  class NamingHost {}

  function inputs(): Record<string, HTMLInputElement> {
    TestBed.configureTestingModule({ imports: [NamingHost] });
    const fixture = TestBed.createComponent(NamingHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const byId: Record<string, HTMLInputElement> = {};
    for (const id of ['bare', 'alias', 'neither', 'named']) {
      byId[id] = root.querySelector(`kj-input#${id} input`) as HTMLInputElement;
    }
    return byId;
  }

  test('the bare `size` input reflects data-size', () => {
    expect(inputs()['bare'].getAttribute('data-size')).toBe('lg');
  });

  test('`size` is the only spelling — the `kjSize` alias is gone', () => {
    expect(inputs()['alias'].getAttribute('data-size')).toBe('sm');
    const src = readFileSync(
      join(process.cwd(), 'src', 'input', 'input.ts'),
      'utf8',
    );
    expect(src).not.toContain('kjSize');
  });

  test('neither set falls back to md, which omits the attribute', () => {
    expect(inputs()['neither'].getAttribute('data-size')).toBeNull();
  });

  test('ariaLabel writes aria-label on the inner input', () => {
    // The table filter row renders a bare <kj-input> with no visible label;
    // without this passthrough it had no programmatic name at all
    // (WCAG 1.3.1 / 4.1.2).
    expect(inputs()['named'].getAttribute('aria-label')).toBe('Filter by name');
  });

  test('ariaLabel omits the attribute when empty, so a field label still wins', () => {
    expect(inputs()['neither'].getAttribute('aria-label')).toBeNull();
  });
});

// arch F-2 / arch F-13 — `invalid` and `disabled` were plain `input(false)`,
// and the CVA reached the inner directive through a decorator `@ViewChild`.
@Component({
  standalone: true,
  imports: [KjInputComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-input id="bare" disabled invalid />`,
})
class BareAttributeHost {}

describe('KjInputComponent — bare boolean attributes (arch F-2)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BareAttributeHost] });
  });

  test('bare `disabled` and `invalid` reach the inner <input>', () => {
    const fixture = TestBed.createComponent(BareAttributeHost);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('kj-input input.kj-input');
    // Same contract the bound form is asserted against above: kjDisabled
    // reflects aria-disabled, and kjInvalid is touched-gated.
    expect(input.getAttribute('aria-disabled')).toBe('true');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});

// arch F-13 — the CVA now reads a signal `viewChild()`; the two-way binding
// must still round-trip in both directions.
@Component({
  standalone: true,
  imports: [KjInputComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-input [(ngModel)]="text" />`,
})
class NgModelHost {
  text = 'seed';
}

describe('KjInputComponent — signal viewChild CVA (arch F-13)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NgModelHost] });
  });

  test('the accessor callbacks survive being registered before the view exists', async () => {
    const fixture = TestBed.createComponent(NgModelHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('kj-input input.kj-input');

    // Angular registers the accessor while setting up the control, before
    // this component's view is created. The `@ViewChild` version dropped
    // every one of those calls behind a `?.`, so `_onChange` was never set
    // and typing reached nothing.
    input.value = 'typed';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.text).toBe('typed');
  });

  test('the model value survives the accessor hand-off', async () => {
    const fixture = TestBed.createComponent(NgModelHost);
    fixture.detectChanges();
    await fixture.whenStable();
    // KNOWN GAP (not this sweep's finding): the inner <input>'s displayed
    // text comes from the component's own `value` input, not from the form
    // control, so `[(ngModel)]` does not paint the initial value. Fixing that
    // means binding `[value]` to the form value when an accessor is attached,
    // which changes the `value` input's meaning — a separate change.
    expect(fixture.componentInstance.text).toBe('seed');
  });
});
