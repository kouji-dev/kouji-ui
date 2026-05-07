import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import {
  KjAlert,
  KjAlertActions,
  KjAlertDescription,
  KjAlertDismiss,
  KjAlertIcon,
  KjAlertTitle,
} from './alert';
import { provideKjAlert } from './config';

expect.extend(toHaveNoViolations);

const ALERT_IMPORTS = [
  KjAlert, KjAlertTitle, KjAlertDescription,
  KjAlertIcon, KjAlertActions, KjAlertDismiss,
];

@Component({
  standalone: true,
  imports: [KjAlert, KjAlertTitle, KjAlertDismiss],
  template: `
    @if (visible()) {
      <div kjAlert (kjAlertDismissed)="onDismissed()">
        <h3 kjAlertTitle>Saved</h3>
        <button kjAlertDismiss>×</button>
      </div>
    }
  `,
})
class DismissHost {
  readonly visible = signal(true);
  fired = 0;
  onDismissed(): void { this.fired++; this.visible.set(false); }
}

describe('KjAlert', () => {
  it('renders with role="status" and aria-live="polite" by default', async () => {
    const { container } = await render(
      `<div kjAlert><h3 kjAlertTitle>Heads up</h3></div>`,
      { imports: ALERT_IMPORTS },
    );
    const root = container.querySelector('[kjAlert]')!;
    expect(root.getAttribute('role')).toBe('status');
    expect(root.getAttribute('aria-live')).toBe('polite');
    expect(root.getAttribute('aria-atomic')).toBe('true');
  });

  it('error variant resolves to assertive (role="alert" + aria-live="assertive")', async () => {
    const { container } = await render(
      `<div kjAlert kjVariant="error"><h3 kjAlertTitle>Failed</h3></div>`,
      { imports: ALERT_IMPORTS },
    );
    const root = container.querySelector('[kjAlert]')!;
    expect(root.getAttribute('role')).toBe('alert');
    expect(root.getAttribute('aria-live')).toBe('assertive');
  });

  it('static flag resolves to role="region" with no aria-live', async () => {
    const { container } = await render(
      `<div kjAlert [kjAlertStatic]="true" aria-label="Banner"><span kjAlertDescription>x</span></div>`,
      { imports: ALERT_IMPORTS },
    );
    const root = container.querySelector('[kjAlert]')!;
    expect(root.getAttribute('role')).toBe('region');
    expect(root.getAttribute('aria-live')).toBeNull();
  });

  it('explicit kjAlertMode wins over the matrix', async () => {
    const { container } = await render(
      `<div kjAlert kjVariant="error" kjAlertMode="polite"><span kjAlertDescription>x</span></div>`,
      { imports: ALERT_IMPORTS },
    );
    const root = container.querySelector('[kjAlert]')!;
    expect(root.getAttribute('role')).toBe('status');
    expect(root.getAttribute('aria-live')).toBe('polite');
  });

  it('mode="off" omits role and aria-live', async () => {
    const { container } = await render(
      `<div kjAlert kjAlertMode="off"><span kjAlertDescription>x</span></div>`,
      { imports: ALERT_IMPORTS },
    );
    const root = container.querySelector('[kjAlert]')!;
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-live')).toBeNull();
  });

  it('reflects data-variant on the host', async () => {
    const { container } = await render(
      `<div kjAlert kjVariant="warning"><span kjAlertDescription>x</span></div>`,
      { imports: ALERT_IMPORTS },
    );
    expect(container.querySelector('[kjAlert]')!.getAttribute('data-variant')).toBe('warning');
  });

  it('wires aria-labelledby to the title id', async () => {
    const { container } = await render(
      `<div kjAlert><h3 kjAlertTitle>Title</h3></div>`,
      { imports: ALERT_IMPORTS },
    );
    const root = container.querySelector('[kjAlert]')!;
    const title = container.querySelector('[kjAlertTitle]')!;
    expect(title.id).toMatch(/-title$/);
    expect(root.getAttribute('aria-labelledby')).toBe(title.id);
  });

  it('wires aria-describedby to the description id', async () => {
    const { container } = await render(
      `<div kjAlert><p kjAlertDescription>Body</p></div>`,
      { imports: ALERT_IMPORTS },
    );
    const root = container.querySelector('[kjAlert]')!;
    const desc = container.querySelector('[kjAlertDescription]')!;
    expect(desc.id).toMatch(/-description$/);
    expect(root.getAttribute('aria-describedby')).toBe(desc.id);
  });

  it('icon sets aria-hidden="true" and mirrors data-variant', async () => {
    const { container } = await render(
      `<div kjAlert kjVariant="success"><span kjAlertIcon></span><span kjAlertDescription>x</span></div>`,
      { imports: ALERT_IMPORTS },
    );
    const icon = container.querySelector('[kjAlertIcon]')!;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('data-variant')).toBe('success');
  });

  it('actions container sets role="group" with default aria-label', async () => {
    const { container } = await render(
      `<div kjAlert>
         <span kjAlertDescription>x</span>
         <div kjAlertActions></div>
       </div>`,
      { imports: ALERT_IMPORTS },
    );
    const actions = container.querySelector('[kjAlertActions]')!;
    expect(actions.getAttribute('role')).toBe('group');
    expect(actions.getAttribute('aria-label')).toBe('Alert actions');
  });

  it('dismiss button has aria-label="Dismiss" and inherits KjButton chrome', async () => {
    const { container } = await render(
      `<div kjAlert><span kjAlertDescription>x</span><button kjAlertDismiss>×</button></div>`,
      { imports: ALERT_IMPORTS },
    );
    const dismiss = container.querySelector('[kjAlertDismiss]')!;
    expect(dismiss.getAttribute('aria-label')).toBe('Dismiss');
    // Inherits the KjButton variant default forwarded by KjAlertDismiss
    expect(dismiss.getAttribute('data-variant')).toBe('ghost');
    expect(dismiss.getAttribute('data-size')).toBe('icon');
  });

  it('clicking dismiss fires kjAlertDismissed (consumer unmounts)', () => {
    TestBed.configureTestingModule({ imports: [DismissHost] });
    const fixture = TestBed.createComponent(DismissHost);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[kjAlertDismiss]');
    btn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.fired).toBe(1);
    expect(fixture.nativeElement.querySelector('[kjAlert]')).toBeNull();
  });

  it('default variant is "info" from KJ_ALERT_DEFAULTS', async () => {
    const { container } = await render(
      `<div kjAlert><span kjAlertDescription>x</span></div>`,
      { imports: ALERT_IMPORTS },
    );
    expect(container.querySelector('[kjAlert]')!.getAttribute('data-variant')).toBe('info');
  });

  it('provideKjAlert at TestBed scope flows into directive defaults', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideKjAlert({
          variants: ['info', 'success', 'warning', 'error', 'neutral', 'brand'],
          defaults: { variant: 'brand', size: 'md' },
        }),
      ],
    });
    const { container } = await render(
      `<div kjAlert><span kjAlertDescription>x</span></div>`,
      { imports: ALERT_IMPORTS },
    );
    expect(container.querySelector('[kjAlert]')!.getAttribute('data-variant')).toBe('brand');
  });

  it('passes axe audit (polite alert)', async () => {
    const { container } = await render(
      `<div kjAlert>
         <h3 kjAlertTitle>Saved</h3>
         <p kjAlertDescription>Your changes were saved.</p>
       </div>`,
      { imports: ALERT_IMPORTS },
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes axe audit (static banner with aria-labelledby)', async () => {
    const { container } = await render(
      `<div kjAlert [kjAlertStatic]="true" aria-labelledby="banner-title">
         <h3 kjAlertTitle id="banner-title">Maintenance</h3>
         <p kjAlertDescription>Down Sat 02:00–04:00 UTC.</p>
       </div>`,
      { imports: ALERT_IMPORTS },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
