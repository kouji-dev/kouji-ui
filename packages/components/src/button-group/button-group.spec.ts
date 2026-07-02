import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KJ_BUTTON_GROUP } from '@kouji-ui/core';
import { KjButtonGroupComponent } from './button-group';
import { KjButtonComponent } from '../button/button';

@Component({
  standalone: true,
  imports: [KjButtonGroupComponent, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button-group
      [kjOrientation]="orientation"
      [kjVariant]="variant"
      [kjSize]="size"
      [kjDisabled]="disabled"
      [kjAriaLabel]="ariaLabel"
    >
      <kj-button>One</kj-button>
      <kj-button>Two</kj-button>
      <kj-button>Three</kj-button>
    </kj-button-group>
  `,
})
class HostComponent {
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  variant: string | undefined = undefined;
  size: string | undefined = undefined;
  disabled = false;
  ariaLabel: string | undefined = undefined;
}

describe('KjButtonGroupComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders host with .kj-button-group class and role="group"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-button-group');
    expect(host).not.toBeNull();
    expect(host.classList.contains('kj-button-group')).toBe(true);
    expect(host.getAttribute('role')).toBe('group');
  });

  test('reflects kjOrientation to data-orientation', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.orientation = 'vertical';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-button-group');
    expect(host.getAttribute('data-orientation')).toBe('vertical');
  });

  test('forwards kjAriaLabel to host', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.ariaLabel = 'Toolbar';
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-button-group');
    expect(host.getAttribute('aria-label')).toBe('Toolbar');
  });

  test('writes data-disabled when kjDisabled is true', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-button-group');
    expect(host.getAttribute('data-disabled')).toBe('');
  });

  test('omits data-disabled when not disabled', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-button-group');
    expect(host.hasAttribute('data-disabled')).toBe(false);
  });

  test('projects child <kj-button> elements', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kj-button-group');
    expect(host.querySelectorAll('button.kj-button').length).toBe(3);
  });

  test('exposes KJ_BUTTON_GROUP context with forwarded variant/size', () => {
    let captured: ReturnType<typeof inject<typeof KJ_BUTTON_GROUP>> | undefined;

    @Component({
      selector: 'kj-bg-probe',
      standalone: true,
      template: '',
    })
    class Probe {
      constructor() {
        captured = inject(KJ_BUTTON_GROUP);
      }
    }

    @Component({
      standalone: true,
      imports: [KjButtonGroupComponent, Probe],
      template: `
        <kj-button-group kjVariant="ghost" kjSize="lg">
          <kj-bg-probe />
        </kj-button-group>
      `,
    })
    class HostWithProbe {}

    TestBed.configureTestingModule({ imports: [HostWithProbe] });
    const fixture = TestBed.createComponent(HostWithProbe);
    fixture.detectChanges();

    expect(captured).toBeDefined();
    expect(captured!.variant()).toBe('ghost');
    expect(captured!.size()).toBe('lg');
  });
});
