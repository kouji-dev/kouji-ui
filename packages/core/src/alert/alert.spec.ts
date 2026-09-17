import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import {
  KjAlert,
  KjAlertActions,
  KjAlertDescription,
  KjAlertDismiss,
  KjAlertIcon,
  KjAlertTitle,
} from './alert';
import { provideKjAlert } from './config';
import { KJ_VARIANT_FALLBACK } from '../presets';
import { EN_CATALOG, FR_CATALOG, provideKjTranslations } from '../i18n/index';
import { provideKjLocale } from '../locale/index';

expect.extend(toHaveNoViolations);

const ALERT_IMPORTS = [
  KjAlert,
  KjAlertTitle,
  KjAlertDescription,
  KjAlertIcon,
  KjAlertActions,
  KjAlertDismiss,
];

@Component({
  standalone: true,
  imports: [KjAlert, KjAlertTitle, KjAlertDismiss],
  changeDetection: ChangeDetectionStrategy.Eager,
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
  onDismissed(): void {
    this.fired++;
    this.visible.set(false);
  }
}

describe('KjAlert', () => {
  it('renders with role="status" and aria-live="polite" by default', async () => {
    const { container } = await render(`<div kjAlert><h3 kjAlertTitle>Heads up</h3></div>`, {
      imports: ALERT_IMPORTS,
    });
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
    const { container } = await render(`<div kjAlert><h3 kjAlertTitle>Title</h3></div>`, {
      imports: ALERT_IMPORTS,
    });
    const root = container.querySelector('[kjAlert]')!;
    const title = container.querySelector('[kjAlertTitle]')!;
    expect(title.id).toMatch(/-title$/);
    expect(root.getAttribute('aria-labelledby')).toBe(title.id);
  });

  it('wires aria-describedby to the description id', async () => {
    const { container } = await render(`<div kjAlert><p kjAlertDescription>Body</p></div>`, {
      imports: ALERT_IMPORTS,
    });
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
    const { container } = await render(`<div kjAlert><span kjAlertDescription>x</span></div>`, {
      imports: ALERT_IMPORTS,
    });
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
    const { container } = await render(`<div kjAlert><span kjAlertDescription>x</span></div>`, {
      imports: ALERT_IMPORTS,
    });
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

describe('KjAlert — shared preset system (cust F-6)', () => {
  // KjAlert used to hand-roll variant/size: its own inputs, its own
  // `data-variant` / `data-size` host bindings and its own dev-mode warn,
  // which kept it out of the KJ_VARIANT_FALLBACK cascade every other
  // stylistic component participates in. It now composes KjVariant / KjSize
  // + bindPresets(KJ_ALERT_CONFIG) like Button, Tag and Spinner.

  it('reflects data-size from the composed KjSize', async () => {
    const { container } = await render(
      `<div kjAlert kjSize="lg"><span kjAlertDescription>x</span></div>`,
      { imports: ALERT_IMPORTS },
    );
    expect(container.querySelector('[kjAlert]')!.getAttribute('data-size')).toBe('lg');
  });

  it('inherits a variant from KJ_VARIANT_FALLBACK when kjVariant is unset', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: KJ_VARIANT_FALLBACK, useValue: signal('error') }],
    });
    const { container } = await render(`<div kjAlert><span kjAlertDescription>x</span></div>`, {
      imports: ALERT_IMPORTS,
    });
    const host = container.querySelector('[kjAlert]')!;
    expect(host.getAttribute('data-variant')).toBe('error');
    // The mode matrix reads the *resolved* variant, so a cascaded `error`
    // must still promote the alert to assertive.
    expect(host.getAttribute('role')).toBe('alert');
  });

  it('an explicit kjVariant beats the cascade', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: KJ_VARIANT_FALLBACK, useValue: signal('error') }],
    });
    const { container } = await render(
      `<div kjAlert kjVariant="success"><span kjAlertDescription>x</span></div>`,
      { imports: ALERT_IMPORTS },
    );
    expect(container.querySelector('[kjAlert]')!.getAttribute('data-variant')).toBe('success');
  });

  it('warns once — not twice — for an unknown variant', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await render(`<div kjAlert kjVariant="nope"><span kjAlertDescription>x</span></div>`, {
      imports: ALERT_IMPORTS,
    });
    const variantWarnings = warn.mock.calls.filter((c) =>
      String(c[0]).includes('unknown variant "nope"'),
    );
    expect(variantWarnings).toHaveLength(1);
    warn.mockRestore();
  });

  it('deep-merges provideKjAlert so naming one default keeps the other', async () => {
    TestBed.configureTestingModule({
      providers: [...provideKjAlert({ defaults: { size: 'lg' } })],
    });
    const { container } = await render(`<div kjAlert><span kjAlertDescription>x</span></div>`, {
      imports: ALERT_IMPORTS,
    });
    const host = container.querySelector('[kjAlert]')!;
    expect(host.getAttribute('data-size')).toBe('lg');
    expect(host.getAttribute('data-variant')).toBe('info');
  });
});

describe('KjAlert labels come from the i18n catalog (cust F-7)', () => {
  it('dismiss and actions labels default to the EN catalog', async () => {
    const { container } = await render(
      `<div kjAlert>
         <span kjAlertDescription>x</span>
         <div kjAlertActions></div>
         <button kjAlertDismiss>x</button>
       </div>`,
      { imports: ALERT_IMPORTS },
    );
    expect(container.querySelector('[kjAlertDismiss]')!.getAttribute('aria-label')).toBe(
      EN_CATALOG['alert.dismiss'],
    );
    expect(container.querySelector('[kjAlertActions]')!.getAttribute('aria-label')).toBe(
      EN_CATALOG['alert.actions'],
    );
  });

  it('a registered catalog translates them with no per-component config', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideKjLocale({ locale: 'fr' }),
        provideKjTranslations({ fr: FR_CATALOG }),
      ],
    });
    const { container } = await render(
      `<div kjAlert>
         <span kjAlertDescription>x</span>
         <div kjAlertActions></div>
         <button kjAlertDismiss>x</button>
       </div>`,
      { imports: ALERT_IMPORTS },
    );
    expect(container.querySelector('[kjAlertDismiss]')!.getAttribute('aria-label')).toBe(
      FR_CATALOG['alert.dismiss'],
    );
    expect(container.querySelector('[kjAlertActions]')!.getAttribute('aria-label')).toBe(
      FR_CATALOG['alert.actions'],
    );
  });

  it('an explicit input still wins over the catalog', async () => {
    const { container } = await render(
      `<div kjAlert>
         <span kjAlertDescription>x</span>
         <button kjAlertDismiss kjAlertDismissLabel="Close banner">x</button>
       </div>`,
      { imports: ALERT_IMPORTS },
    );
    expect(container.querySelector('[kjAlertDismiss]')!.getAttribute('aria-label')).toBe(
      'Close banner',
    );
  });
});

/**
 * arch F-13 — `KjAlertTitle` / `KjAlertDescription` register in their
 * constructor and unregister through `DestroyRef` rather than `ngOnDestroy`.
 * The observable contract is the alert's accessible name / description.
 */
describe('KjAlert title + description registry without lifecycle hooks', () => {
  @Component({
    standalone: true,
    imports: [KjAlert, KjAlertTitle, KjAlertDescription],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
      <div kjAlert>
        @if (showTitle()) {
          <div kjAlertTitle>Saved</div>
        }
        @if (showDescription()) {
          <div kjAlertDescription>Your changes are live.</div>
        }
      </div>
    `,
  })
  class Host {
    readonly showTitle = signal(true);
    readonly showDescription = signal(true);
  }

  it('wires aria-labelledby / aria-describedby, and drops them when the cells go', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[kjAlert]') as HTMLElement;
    const titleId = (fixture.nativeElement.querySelector('[kjAlertTitle]') as HTMLElement).id;
    const descId = (fixture.nativeElement.querySelector('[kjAlertDescription]') as HTMLElement).id;
    expect(titleId).not.toBe('');
    expect(alert.getAttribute('aria-labelledby')).toBe(titleId);
    expect(alert.getAttribute('aria-describedby')).toBe(descId);

    fixture.componentInstance.showTitle.set(false);
    fixture.componentInstance.showDescription.set(false);
    fixture.detectChanges();

    expect(alert.hasAttribute('aria-labelledby')).toBe(false);
    expect(alert.hasAttribute('aria-describedby')).toBe(false);
  });
});
