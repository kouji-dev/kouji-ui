import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  KjFormActionsComponent,
  KjFormComponent,
  KjFormSummaryComponent,
} from './form';

@Component({
  standalone: true,
  imports: [
    KjFormComponent,
    KjFormActionsComponent,
    KjFormSummaryComponent,
    ReactiveFormsModule,
  ],
  template: `
    <form
      kj-form
      [formGroup]="form"
      (kjSubmit)="value.set($event)"
      (kjInvalidSubmit)="invalid.set($event)"
    >
      @if (showSummary) {
        <kj-form-summary />
      }
      <input id="email" formControlName="email" />
      <input id="name" formControlName="name" />
      <kj-form-actions>
        <button type="submit">Save</button>
      </kj-form-actions>
    </form>
  `,
})
class HostComponent {
  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    name: new FormControl('', [Validators.required]),
  });
  value = signal<unknown>(null);
  invalid = signal<unknown>(null);
  showSummary = false;
}

describe('KjFormComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('applies the .kj-form class to the host <form>', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    expect(form).not.toBeNull();
    expect(form.classList.contains('kj-form')).toBe(true);
  });

  it('renders an action group with role="group"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const actions: HTMLElement = fixture.nativeElement.querySelector('kj-form-actions');
    expect(actions).not.toBeNull();
    expect(actions.getAttribute('role')).toBe('group');
  });

  it('emits (kjSubmit) when valid', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ email: 'a@b.co', name: 'Ada' });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    expect(fixture.componentInstance.value()).toEqual({ email: 'a@b.co', name: 'Ada' });
  });

  it('emits (kjInvalidSubmit) when invalid', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    expect(fixture.componentInstance.value()).toBeNull();
    expect(fixture.componentInstance.invalid()).toBe(fixture.componentInstance.form);
  });

  it('summary is hidden by default and visible after invalid submit', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.showSummary = true;
    fixture.detectChanges();
    const summary: HTMLElement = fixture.nativeElement.querySelector('kj-form-summary');
    expect(summary.getAttribute('data-visible')).toBeNull();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(summary.getAttribute('data-visible')).toBe('');
  });

  it('summary renders an item per invalid control', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.showSummary = true;
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('kj-form-summary li');
    expect(items.length).toBe(2);
  });
});
