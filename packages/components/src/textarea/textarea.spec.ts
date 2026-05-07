import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjTextareaComponent } from './textarea';

@Component({
  standalone: true,
  imports: [KjTextareaComponent, ReactiveFormsModule],
  template: `
    <kj-textarea
      [kjRows]="rows"
      [kjPlaceholder]="placeholder"
      [kjVariant]="variant"
      [kjSize]="size"
      [kjInvalid]="invalid"
      [kjDisabled]="disabled"
      [kjResize]="resize"
      [kjAutoresize]="autoresize"
      [kjMinRows]="minRows"
      [kjMaxRows]="maxRows"
      [kjMaxLength]="maxLength"
      [kjShowCounter]="showCounter"
      [formControl]="ctrl"
    ></kj-textarea>
  `,
})
class HostComponent {
  ctrl = new FormControl('');
  rows = 3;
  placeholder = '';
  variant: string = 'outlined';
  size: string = 'md';
  invalid = false;
  disabled = false;
  resize: 'none' | 'vertical' | 'both' = 'vertical';
  autoresize: 'off' | 'auto' = 'off';
  minRows: number | undefined = undefined;
  maxRows: number | undefined = undefined;
  maxLength: number | undefined = undefined;
  showCounter = false;
}

describe('KjTextareaComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <textarea> with the .kj-textarea class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-textarea textarea.kj-textarea')).not.toBeNull();
  });

  test('forwards rows and placeholder to the inner textarea', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.rows = 5;
    fixture.componentInstance.placeholder = 'Type here…';
    fixture.detectChanges();
    const ta: HTMLTextAreaElement = fixture.nativeElement.querySelector('kj-textarea textarea');
    expect(ta.getAttribute('rows')).toBe('5');
    expect(ta.getAttribute('placeholder')).toBe('Type here…');
  });

  test('forwards variant and size as data-* attributes', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'filled';
    fixture.componentInstance.size = 'sm';
    fixture.detectChanges();
    const ta: HTMLTextAreaElement = fixture.nativeElement.querySelector('kj-textarea textarea');
    expect(ta.getAttribute('data-variant')).toBe('filled');
    expect(ta.getAttribute('data-size')).toBe('sm');
  });

  test('binds maxlength when kjMaxLength is set', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.maxLength = 50;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('kj-textarea textarea').getAttribute('maxlength'),
    ).toBe('50');
  });

  test('renders the counter when kjShowCounter and kjMaxLength are set', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.maxLength = 50;
    fixture.componentInstance.showCounter = true;
    fixture.detectChanges();
    const counter = fixture.nativeElement.querySelector('.kj-textarea__counter');
    expect(counter).not.toBeNull();
    expect(counter.textContent.trim()).toContain('/ 50');
  });

  test('does not render the counter without kjMaxLength', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.showCounter = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kj-textarea__counter')).toBeNull();
  });

  test('counter element id is wired into the textareas aria-describedby', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.maxLength = 50;
    fixture.componentInstance.showCounter = true;
    fixture.detectChanges();
    const counter = fixture.nativeElement.querySelector('.kj-textarea__counter');
    const ta: HTMLTextAreaElement = fixture.nativeElement.querySelector('kj-textarea textarea');
    const describedBy = ta.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(describedBy).toBe(counter.id);
  });

  test('counter updates with the form-control value', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.maxLength = 50;
    fixture.componentInstance.showCounter = true;
    fixture.detectChanges();
    fixture.componentInstance.ctrl.setValue('hello');
    fixture.detectChanges();
    const counter = fixture.nativeElement.querySelector('.kj-textarea__counter');
    expect(counter.textContent.trim()).toBe('5 / 50');
  });

  test('forwards kjResize to inline style on the inner textarea', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.resize = 'both';
    fixture.detectChanges();
    const ta: HTMLTextAreaElement = fixture.nativeElement.querySelector('kj-textarea textarea');
    expect(ta.style.resize).toBe('both');
  });

  test('autoresize=auto forces resize:none and sets data-autoresize', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.autoresize = 'auto';
    fixture.componentInstance.resize = 'both';
    fixture.detectChanges();
    const ta: HTMLTextAreaElement = fixture.nativeElement.querySelector('kj-textarea textarea');
    expect(ta.style.resize).toBe('none');
    expect(ta.getAttribute('data-autoresize')).toBe('');
  });

  test('forwards disabled (aria-disabled on inner textarea)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('kj-textarea textarea').getAttribute('aria-disabled'),
    ).toBe('true');
  });

  test('forwards invalid → aria-invalid (after blur)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.invalid = true;
    fixture.detectChanges();
    const ta: HTMLTextAreaElement = fixture.nativeElement.querySelector('kj-textarea textarea');
    ta.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(ta.getAttribute('aria-invalid')).toBe('true');
  });
});
