import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { provideKjButton } from '@kouji-ui/core';
import { KjButtonComponent } from './button';

@Component({
  standalone: true,
  imports: [KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-button
    [kjVariant]="variant"
    [kjSize]="size"
    [kjDisabled]="disabled"
    [kjLoading]="loading"
    [kjPressed]="pressed"
    [kjAriaLabel]="ariaLabel"
    >{{ label }}</kj-button
  >`,
})
class HostComponent {
  variant: string | undefined = undefined;
  size: string | undefined = undefined;
  disabled = false;
  loading = false;
  pressed: boolean | undefined = undefined;
  ariaLabel: string | undefined = undefined;
  label = 'Click';
}

describe('KjButtonComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <button> with the .kj-button class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.kj-button')).not.toBeNull();
  });

  test('forwards variant via [kjVariant] (data-variant attr)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'destructive';
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('button.kj-button').getAttribute('data-variant'),
    ).toBe('destructive');
  });

  test('forwards size via [kjSize] (data-size attr)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.size = 'sm';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.kj-button').getAttribute('data-size')).toBe(
      'sm',
    );
  });

  test('unset variant/size resolve to the library defaults on the inner button', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button.kj-button');
    expect(btn.getAttribute('data-variant')).toBe('default');
    expect(btn.getAttribute('data-size')).toBe('md');
  });

  test('provideKjButton defaults are respected when variant/size are unset', () => {
    @Component({
      standalone: true,
      imports: [KjButtonComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      providers: [
        provideKjButton({
          variants: ['default', 'brand'],
          sizes: ['md', 'xl'],
          defaults: { variant: 'brand', size: 'xl' },
        }),
      ],
      template: `<kj-button>Configured</kj-button>`,
    })
    class ConfiguredHost {}

    const fixture = TestBed.createComponent(ConfiguredHost);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button.kj-button');
    expect(btn.getAttribute('data-variant')).toBe('brand');
    expect(btn.getAttribute('data-size')).toBe('xl');
  });

  test('explicit variant/size win over provideKjButton defaults', () => {
    @Component({
      standalone: true,
      imports: [KjButtonComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      providers: [
        provideKjButton({
          variants: ['default', 'brand', 'destructive'],
          defaults: { variant: 'brand', size: 'lg' },
        }),
      ],
      template: `<kj-button kjVariant="destructive" kjSize="sm">Explicit</kj-button>`,
    })
    class ExplicitHost {}

    const fixture = TestBed.createComponent(ExplicitHost);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button.kj-button');
    expect(btn.getAttribute('data-variant')).toBe('destructive');
    expect(btn.getAttribute('data-size')).toBe('sm');
  });

  test('forwards disabled (aria-disabled attr on inner button)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('button.kj-button').getAttribute('aria-disabled'),
    ).toBe('true');
  });

  test('forwards loading: aria-busy on inner button + spinner element rendered', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.loading = true;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button.kj-button');
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.querySelector('.kj-button__spinner')).not.toBeNull();
  });

  test('does not render spinner when loading is false', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kj-button__spinner')).toBeNull();
  });

  test('forwards pressed (aria-pressed attr on inner button)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.pressed = true;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('button.kj-button').getAttribute('aria-pressed'),
    ).toBe('true');
  });

  test('forwards ariaLabel to the inner button', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.ariaLabel = 'Save changes';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.kj-button').getAttribute('aria-label')).toBe(
      'Save changes',
    );
  });
});
