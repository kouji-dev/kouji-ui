import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { toHaveNoViolations } from 'jest-axe';
import { KjFormControl } from './form-control';

expect.extend(toHaveNoViolations);

@Component({
  standalone: true,
  imports: [KjFormControl, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<input
    kjFormControl
    [formControl]="ctrl"
    (input)="onInput($event)"
    (blur)="onBlur()"
  />`,
})
class TestHostComponent {
  ctrl = new FormControl('');
  formCtrl!: KjFormControl;
  onInput(_e: Event): void {
    // will be wired by the directive consumer pattern
  }
  onBlur(): void {}
}

describe('KjFormControl', () => {
  it('registers as NG_VALUE_ACCESSOR so formControl binding works', async () => {
    const { container } = await render(TestHostComponent);
    expect(container.querySelector('input')).toBeInTheDocument();
  });

  it('writeValue updates the value signal', async () => {
    const { fixture } = await render(TestHostComponent);
    const directive = fixture.debugElement.children[0].injector.get(KjFormControl);
    directive.writeValue('hello');
    expect(directive.value()).toBe('hello');
  });

  it('setDisabledState updates the disabled signal', async () => {
    const { fixture } = await render(TestHostComponent);
    const directive = fixture.debugElement.children[0].injector.get(KjFormControl);
    directive.setDisabledState(true);
    expect(directive.disabled()).toBe(true);
  });

  it('notifyChange updates value and calls onChange', async () => {
    const { fixture } = await render(TestHostComponent);
    const directive = fixture.debugElement.children[0].injector.get(KjFormControl);
    let emitted: unknown;
    directive.registerOnChange((v) => {
      emitted = v;
    });
    directive.notifyChange('test');
    expect(directive.value()).toBe('test');
    expect(emitted).toBe('test');
  });

  it('notifyTouched marks touched', async () => {
    const { fixture } = await render(TestHostComponent);
    const directive = fixture.debugElement.children[0].injector.get(KjFormControl);
    directive.notifyTouched();
    expect(directive.touched()).toBe(true);
  });
});

describe('KjFormControl.delegateTo (arch F-19)', () => {
  const make = (): KjFormControl => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [KjFormControl] });
    return TestBed.inject(KjFormControl);
  };

  it('replays a value written before the inner control existed', () => {
    const outer = make();
    const inner = new KjFormControl();
    // Angular seeds the accessor while setting the control up - before the
    // wrapper's view query resolves. The four hand-written forwarding methods
    // this replaced dropped that write (`this.inner()?.formCtrl`).
    outer.writeValue('seeded');
    expect(inner.value()).toBeUndefined();
    outer.delegateTo(inner);
    expect(inner.value()).toBe('seeded');
  });

  it('forwards later writes and the disabled state, and is idempotent', () => {
    const outer = make();
    const inner = new KjFormControl();
    outer.delegateTo(inner);
    outer.delegateTo(inner);
    outer.writeValue('later');
    expect(inner.value()).toBe('later');
    outer.setDisabledState(true);
    expect(inner.disabled()).toBe(true);
    expect(outer.disabled()).toBe(true);
  });

  it("routes the inner control's notifyChange / notifyTouched to the consumer's form", () => {
    const outer = make();
    const inner = new KjFormControl();
    const seen: unknown[] = [];
    let touched = 0;
    outer.registerOnChange((v) => seen.push(v));
    outer.registerOnTouched(() => touched++);
    outer.delegateTo(inner);

    inner.notifyChange('typed');
    expect(seen).toEqual(['typed']);
    expect(outer.value()).toBe('typed');

    inner.notifyTouched();
    expect(touched).toBe(1);
    expect(outer.touched()).toBe(true);
  });

  it('maps values on the way in with `toInner`, keeping the outer value untouched', () => {
    const outer = make();
    const inner = new KjFormControl();
    outer.delegateTo(inner, { toInner: (v) => v ?? '' });
    outer.writeValue(null);
    expect(inner.value()).toBe('');
    expect(outer.value()).toBeNull();
  });

  it('ignores a null target and refuses to delegate to itself', () => {
    const outer = make();
    outer.delegateTo(undefined);
    outer.delegateTo(outer);
    outer.writeValue('x');
    expect(outer.value()).toBe('x');
  });
});

describe('KjFormControl.onWriteValue (arch F-19)', () => {
  it('runs synchronously on every write, including the seeding one', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [KjFormControl] });
    const ctrl = TestBed.inject(KjFormControl);
    const writes: unknown[] = [];
    ctrl.onWriteValue((v) => writes.push(v));
    ctrl.writeValue('a');
    ctrl.writeValue('b');
    // Synchronous: no tick, no detectChanges - that is the whole point for an
    // editor whose document has to be replaced in the same turn.
    expect(writes).toEqual(['a', 'b']);
  });
});

describe('NG_VALUE_ACCESSOR is only provided by the primitive (arch F-19)', () => {
  it('no library source outside primitives/forms declares a raw NG_VALUE_ACCESSOR provider', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const { join, sep } = await import('node:path');
    const roots = [
      join(process.cwd(), 'src'),
      join(process.cwd(), '..', 'components', 'src'),
    ];
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === '_examples') continue;
          walk(p);
          continue;
        }
        if (!e.name.endsWith('.ts')) continue;
        if (e.name.endsWith('.spec.ts') || e.name.includes('.example.') || e.name.includes('.playground.')) continue;
        if (p.includes(`${sep}primitives${sep}forms${sep}`)) continue;
        if (/provide:\s*NG_VALUE_ACCESSOR/.test(readFileSync(p, 'utf8'))) offenders.push(p);
      }
    };
    roots.forEach(walk);
    // The five bespoke ControlValueAccessors of arch F-19 all compose
    // KjFormControl now. A new one belongs in primitives/forms, not in a
    // component.
    expect(offenders).toEqual([]);
  });
});
