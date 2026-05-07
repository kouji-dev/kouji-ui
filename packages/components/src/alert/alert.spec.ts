import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  KjAlertActionsComponent,
  KjAlertComponent,
  KjAlertDescriptionComponent,
  KjAlertDismissComponent,
  KjAlertIconComponent,
  KjAlertTitleComponent,
} from './alert';

@Component({
  standalone: true,
  imports: [
    KjAlertComponent,
    KjAlertIconComponent,
    KjAlertTitleComponent,
    KjAlertDescriptionComponent,
    KjAlertActionsComponent,
    KjAlertDismissComponent,
  ],
  template: `
    @if (visible()) {
      <kj-alert
        [kjVariant]="variant"
        [kjSize]="size"
        [kjAlertStatic]="staticBanner"
        [kjAlertMode]="mode"
        (kjAlertDismissed)="onDismissed()"
      >
        <kj-alert-icon />
        <kj-alert-title>Title</kj-alert-title>
        <kj-alert-description>Body</kj-alert-description>
        <kj-alert-actions>
          <button>Retry</button>
        </kj-alert-actions>
        <kj-alert-dismiss />
      </kj-alert>
    }
  `,
})
class HostComponent {
  variant = 'info';
  size = 'md';
  staticBanner = false;
  mode: 'assertive' | 'polite' | 'static' | 'off' | undefined = undefined;
  visible = signal(true);
  fired = 0;
  onDismissed(): void { this.fired++; this.visible.set(false); }
}

describe('KjAlertComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders kj-alert host with role="status" by default', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('kj-alert')!;
    expect(root.getAttribute('role')).toBe('status');
    expect(root.getAttribute('aria-live')).toBe('polite');
  });

  test('forwards kjVariant via host directive (data-variant)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'warning';
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('kj-alert')!;
    expect(root.getAttribute('data-variant')).toBe('warning');
  });

  test('forwards kjSize via host directive (data-size)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.size = 'lg';
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('kj-alert')!;
    expect(root.getAttribute('data-size')).toBe('lg');
  });

  test('error variant resolves to assertive (role="alert")', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'error';
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('kj-alert')!;
    expect(root.getAttribute('role')).toBe('alert');
    expect(root.getAttribute('aria-live')).toBe('assertive');
  });

  test('kjAlertStatic switches to role="region" with no aria-live', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.staticBanner = true;
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('kj-alert')!;
    expect(root.getAttribute('role')).toBe('region');
    expect(root.getAttribute('aria-live')).toBeNull();
  });

  test('explicit kjAlertMode wins over the matrix', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'error';
    fixture.componentInstance.mode = 'polite';
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('kj-alert')!;
    expect(root.getAttribute('role')).toBe('status');
    expect(root.getAttribute('aria-live')).toBe('polite');
  });

  test('renders icon, title, description, actions, dismiss slots', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kj-alert-icon')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('kj-alert-title')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('kj-alert-description')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('kj-alert-actions')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button.kj-alert__dismiss')).not.toBeNull();
  });

  test('alert root wires aria-labelledby to the title id', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('kj-alert')!;
    const title = fixture.nativeElement.querySelector('kj-alert-title')!;
    expect(title.getAttribute('id')).toMatch(/-title$/);
    expect(root.getAttribute('aria-labelledby')).toBe(title.getAttribute('id'));
  });

  test('actions container exposes role="group"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const actions = fixture.nativeElement.querySelector('kj-alert-actions');
    expect(actions.getAttribute('role')).toBe('group');
    expect(actions.getAttribute('aria-label')).toBe('Alert actions');
  });

  test('clicking the dismiss button fires kjAlertDismissed and consumer unmounts', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const dismissBtn = fixture.nativeElement.querySelector('button.kj-alert__dismiss');
    expect(dismissBtn).not.toBeNull();
    dismissBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.fired).toBe(1);
    expect(fixture.nativeElement.querySelector('kj-alert')).toBeNull();
  });

  test('dismiss button has aria-label="Dismiss"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const dismissBtn = fixture.nativeElement.querySelector('button.kj-alert__dismiss');
    expect(dismissBtn.getAttribute('aria-label')).toBe('Dismiss');
  });

  test('icon picks up aria-hidden="true" and data-variant from context', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'success';
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('kj-alert-icon')!;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('data-variant')).toBe('success');
  });
});
