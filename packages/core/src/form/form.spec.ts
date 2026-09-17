import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { describe, expect, it, vi } from 'vitest';
import { KjForm } from './form';
import { KjFormErrorSummary } from './form-error-summary';
import { KjFormField, KjFormLabel } from './form-field';

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

@Component({
  standalone: true,
  imports: [KjForm, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @for (g of groups; track $index) {
      <form kjForm [formGroup]="g" kjScrollOnError kjScrollBehavior="smooth">
        <input [id]="'s-' + $index + '-email'" formControlName="email" />
      </form>
    }
  `,
})
class ScrollHost {
  groups = [0, 1, 2].map(
    () => new FormGroup({ email: new FormControl('', [Validators.required]) }),
  );
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

  // perf F-15 — the directive used to call the bare global `matchMedia` from
  // its own `afterNextRender`, once per <form kjForm>. It now reads the root
  // KjReducedMotion service, so scrollIntoView still downgrades to 'auto'
  // under reduced motion without a per-form subscription.
  describe('reduced motion comes from the root service (perf F-15)', () => {
    it('downgrades the error scroll to behavior: auto and queries matchMedia once for three forms', async () => {
      const original = window.matchMedia;
      const matchMedia = vi.fn(() => ({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList);
      window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
      try {
        const fixture = TestBed.createComponent(ScrollHost);
        fixture.detectChanges();
        // Let the service's afterNextRender read land.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const forms: HTMLFormElement[] = Array.from(fixture.nativeElement.querySelectorAll('form'));
        expect(forms).toHaveLength(3);
        const target: HTMLInputElement = fixture.nativeElement.querySelector('#s-0-email');
        const scrollIntoView = vi.fn();
        target.scrollIntoView = scrollIntoView;
        forms[0].dispatchEvent(new Event('submit'));
        expect(scrollIntoView).toHaveBeenCalledWith(
          expect.objectContaining({ behavior: 'auto' }),
        );
        expect(matchMedia).toHaveBeenCalledTimes(1);
      } finally {
        window.matchMedia = original;
      }
    });
  });

// arch F-2 — every boolean `input()` on `[kjForm]` carries
// `transform: booleanAttribute`; `kjSubmitting` is a `model()`, and Angular's
// `ModelOptions` has no `transform`, so that one is bind-only by construction.
describe('KjForm — boolean attribute forms (arch F-2)', () => {
  it('kjMarkAllAsTouchedOnSubmit="false" turns a default-true flag off', () => {
    @Component({
      standalone: true,
      imports: [KjForm, ReactiveFormsModule],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `
        <form kjForm [formGroup]="group" kjMarkAllAsTouchedOnSubmit="false">
          <input id="email" formControlName="email" />
          <button type="submit">Go</button>
        </form>
      `,
    })
    class BareHost {
      group = new FormGroup({ email: new FormControl('', [Validators.required]) });
    }
    const fixture = TestBed.createComponent(BareHost);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.group.controls.email.touched).toBe(false);
  });

  it('the same flag left at its default marks controls touched on submit', () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.group.controls.email.touched).toBe(true);
  });

  it('bare kjFieldInvalid reflects data-invalid on the field and its label', () => {
    @Component({
      standalone: true,
      imports: [KjFormField, KjFormLabel],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `
        <div kjFormField kjFieldInvalid data-test="f">
          <label kjFormLabel data-test="l" for="n">Name</label>
          <input id="n" />
        </div>
      `,
    })
    class BareHost {}
    const fixture = TestBed.createComponent(BareHost);
    fixture.detectChanges();
    const field = fixture.nativeElement.querySelector('[data-test="f"]') as HTMLElement;
    const label = fixture.nativeElement.querySelector('[data-test="l"]') as HTMLElement;
    expect(field.hasAttribute('data-invalid')).toBe(true);
    expect(label.hasAttribute('data-invalid')).toBe(true);
  });
});
});
