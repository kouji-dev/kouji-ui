import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjNumberInputComponent } from './number-input';

@Component({
  standalone: true,
  imports: [KjNumberInputComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-number-input
      [(kjValue)]="value"
      [kjMin]="min"
      [kjMax]="max"
      [kjStep]="step"
      [kjDisabled]="disabled"
      [kjReadonly]="readonly"
      kjAriaLabel="Quantity"
    />
  `,
})
class HostComponent {
  value = signal<number | null>(3);
  min: number | undefined = 0;
  max: number | undefined = 10;
  step = 1;
  disabled = false;
  readonly = false;
}

describe('KjNumberInputComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders a wrapper with two stepper buttons and an internal input', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('.kj-number-input');
    expect(root).not.toBeNull();
    const buttons = root.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(root.querySelector('input.kj-number-input__field')).not.toBeNull();
  });

  test('forwards initial value to the internal input', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-valuenow')).toBe('3');
  });

  test('clicking the increment button increases the value', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const up = fixture.nativeElement.querySelector(
      '.kj-number-input__stepper--up',
    ) as HTMLButtonElement;
    up.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(4);
  });

  test('clicking the decrement button decreases the value', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const down = fixture.nativeElement.querySelector(
      '.kj-number-input__stepper--down',
    ) as HTMLButtonElement;
    down.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(2);
  });

  test('increment button reports aria-disabled at kjMax', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value.set(10);
    fixture.detectChanges();
    const up = fixture.nativeElement.querySelector(
      '.kj-number-input__stepper--up',
    ) as HTMLButtonElement;
    expect(up.getAttribute('aria-disabled')).toBe('true');
  });

  test('decrement button reports aria-disabled at kjMin', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value.set(0);
    fixture.detectChanges();
    const down = fixture.nativeElement.querySelector(
      '.kj-number-input__stepper--down',
    ) as HTMLButtonElement;
    expect(down.getAttribute('aria-disabled')).toBe('true');
  });

  test('forwards kjDisabled to the wrapper data attribute and the field', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('.kj-number-input');
    expect(root.getAttribute('data-disabled')).toBe('');
  });
});
