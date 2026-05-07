import { Component, type DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjTextarea } from './textarea';

@Component({
  standalone: true,
  imports: [KjTextarea, ReactiveFormsModule],
  template: `
    <textarea
      kjTextarea
      [formControl]="ctrl"
      [kjInvalid]="invalid"
      [kjResize]="resize"
      [kjAutoresize]="autoresize"
      [kjMinRows]="minRows"
      [kjMaxRows]="maxRows"
      [kjMaxLength]="maxLength"
      [kjVariant]="variant"
      [kjSize]="size"
      [kjDisabled]="disabled"></textarea>
  `,
})
class HostComponent {
  ctrl = new FormControl('');
  invalid = false;
  resize: 'none' | 'vertical' | 'both' = 'vertical';
  autoresize: 'off' | 'auto' = 'off';
  minRows: number | undefined = undefined;
  maxRows: number | undefined = undefined;
  maxLength: number | undefined = undefined;
  variant: string = 'outlined';
  size: string = 'md';
  disabled = false;
}

describe('KjTextarea', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders the directive on a native <textarea>', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const ta = fixture.nativeElement.querySelector('textarea');
    expect(ta).not.toBeNull();
  });

  test('reflects variant and size to data-* host attributes', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'filled';
    fixture.componentInstance.size = 'sm';
    fixture.detectChanges();
    const ta = fixture.nativeElement.querySelector('textarea');
    expect(ta.getAttribute('data-variant')).toBe('filled');
    expect(ta.getAttribute('data-size')).toBe('sm');
  });

  test('writes form-control value into the native element', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.ctrl.setValue('hello');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea').value).toBe('hello');
  });

  test('forwards user input back to the form-control', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const ta: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    ta.value = 'typed';
    ta.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.ctrl.value).toBe('typed');
  });

  test('sets aria-invalid only after touched + invalid', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.invalid = true;
    fixture.detectChanges();
    const ta: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    // Not yet touched.
    expect(ta.getAttribute('aria-invalid')).toBeNull();
    ta.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(ta.getAttribute('aria-invalid')).toBe('true');
  });

  test('binds maxlength when kjMaxLength is set', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.maxLength = 200;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea').getAttribute('maxlength')).toBe('200');
  });

  test('omits maxlength when kjMaxLength is undefined', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea').getAttribute('maxlength')).toBeNull();
  });

  test('applies kjResize to inline style.resize', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.resize = 'both';
    fixture.detectChanges();
    const ta: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    expect(ta.style.resize).toBe('both');
  });

  test('forces resize:none when kjAutoresize is on', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.resize = 'both';
    fixture.componentInstance.autoresize = 'auto';
    fixture.detectChanges();
    const ta: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    expect(ta.style.resize).toBe('none');
    expect(ta.getAttribute('data-autoresize')).toBe('');
  });

  test('reflects native disabled when the form control is disabled', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.ctrl.disable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('textarea').hasAttribute('disabled')).toBe(true);
  });

  test('counterAnnouncement is empty when kjMaxLength is unset', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const debugEl = fixture.debugElement.query((el: DebugElement) => el.name === 'textarea');
    const dir = debugEl.injector.get(KjTextarea);
    expect(dir.counterAnnouncement()).toBe('');
    expect(dir.remaining()).toBeNull();
  });

  test('remaining computes from value length when kjMaxLength is set', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.maxLength = 200;
    fixture.detectChanges();
    fixture.componentInstance.ctrl.setValue('hello');
    fixture.detectChanges();
    const debugEl = fixture.debugElement.query((el: DebugElement) => el.name === 'textarea');
    const dir = debugEl.injector.get(KjTextarea);
    expect(dir.remaining()).toBe(195);
  });

  test('counterAnnouncement crosses thresholds at 20, 10, 0 remaining', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.maxLength = 30;
    fixture.detectChanges();
    const debugEl = fixture.debugElement.query((el: DebugElement) => el.name === 'textarea');
    const dir = debugEl.injector.get(KjTextarea);

    // 20 remaining -> length 10
    fixture.componentInstance.ctrl.setValue('a'.repeat(10));
    fixture.detectChanges();
    expect(dir.counterAnnouncement()).toBe('20 characters remaining');

    // 10 remaining -> length 20
    fixture.componentInstance.ctrl.setValue('a'.repeat(20));
    fixture.detectChanges();
    expect(dir.counterAnnouncement()).toBe('10 characters remaining');

    // 0 remaining -> length 30
    fixture.componentInstance.ctrl.setValue('a'.repeat(30));
    fixture.detectChanges();
    expect(dir.counterAnnouncement()).toBe('Character limit reached');

    // Off-threshold -> empty
    fixture.componentInstance.ctrl.setValue('a'.repeat(15));
    fixture.detectChanges();
    expect(dir.counterAnnouncement()).toBe('');
  });
});
