import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { KjForm } from './form';
import { KjFormErrorSummary } from './form-error-summary';

@Component({
  standalone: true,
  imports: [KjForm, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form
      kjForm
      [formGroup]="group"
      (kjSubmit)="submitted.set($event)"
      (kjInvalidSubmit)="invalid.set($event)"
    >
      <input id="email" formControlName="email" />
      <input id="password" formControlName="password" />
      <button type="submit">Sign in</button>
    </form>
  `,
})
class ReactiveHost {
  group = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });
  submitted = signal<unknown>(null);
  invalid = signal<unknown>(null);
}

@Component({
  standalone: true,
  imports: [KjForm, KjFormErrorSummary, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form kjForm [formGroup]="group" (kjSubmit)="submitted.set($event)">
      <div kjFormErrorSummary #s="kjFormErrorSummary">
        @if (s.visible()) {
          <strong>{{ s.invalidControls().length }} errors</strong>
          <ul>
            @for (item of s.invalidControls(); track item.path) {
              <li>{{ item.label }}</li>
            }
          </ul>
        }
      </div>
      <input id="email" formControlName="email" />
      <input id="name" formControlName="name" />
      <button type="submit">Save</button>
    </form>
  `,
})
class SummaryHost {
  group = new FormGroup({
    email: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
  });
  submitted = signal<unknown>(null);
}

describe('KjForm', () => {
  it('emits (kjSubmit) with form value when valid', () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    fixture.componentInstance.group.setValue({ email: 'a@b.co', password: 'x' });
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    expect(fixture.componentInstance.submitted()).toEqual({ email: 'a@b.co', password: 'x' });
    expect(fixture.componentInstance.invalid()).toBeNull();
  });

  it('emits (kjInvalidSubmit) and not (kjSubmit) when invalid', () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    expect(fixture.componentInstance.submitted()).toBeNull();
    expect(fixture.componentInstance.invalid()).toBe(fixture.componentInstance.group);
  });

  it('marks all controls as touched on submit by default', () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    expect(fixture.componentInstance.group.controls.email.touched).toBe(true);
    expect(fixture.componentInstance.group.controls.password.touched).toBe(true);
  });

  it('reflects data-invalid attribute when last submit was invalid', () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(form.getAttribute('data-invalid')).toBe('');
  });

  it('prevents native form submission', () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    const event = new Event('submit', { cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('focuses the first invalid control on submit', () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('#email');
    form.dispatchEvent(new Event('submit'));
    expect(document.activeElement).toBe(emailInput);
  });

  it('does not run async submit when validity fails', async () => {
    let calls = 0;
    @Component({
      standalone: true,
      imports: [KjForm, ReactiveFormsModule],
      template: `<form kjForm [formGroup]="group" [kjAsyncSubmit]="handler">
        <input formControlName="x" /><button type="submit">go</button>
      </form>`,
    })
    class Host {
      group = new FormGroup({ x: new FormControl('', [Validators.required]) });
      handler = (): Promise<void> => {
        calls++;
        return Promise.resolve();
      };
    }
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    expect(calls).toBe(0);
  });
});

describe('KjFormErrorSummary', () => {
  it('exposes invalid controls after invalid submit', () => {
    const fixture = TestBed.createComponent(SummaryHost);
    fixture.detectChanges();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items.length).toBe(2);
  });

  it('wires aria-describedby on the form to the summary id', () => {
    const fixture = TestBed.createComponent(SummaryHost);
    fixture.detectChanges();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    const summary: HTMLElement = fixture.nativeElement.querySelector('[kjFormErrorSummary]');
    fixture.detectChanges();
    expect(form.getAttribute('aria-describedby')).toBe(summary.id);
  });
});
