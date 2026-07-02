import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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
