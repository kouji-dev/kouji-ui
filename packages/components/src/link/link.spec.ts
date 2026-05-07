import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjLinkComponent } from './link';

@Component({
  standalone: true,
  imports: [KjLinkComponent],
  template: `
    <kj-link
      [kjHref]="href"
      [kjTarget]="target"
      [kjAriaLabel]="ariaLabel"
      [kjVariant]="variant"
      [kjSize]="size"
      [kjUnderline]="underline"
      [kjExternal]="external"
      [kjDisabled]="disabled"
    >{{ label }}</kj-link>
  `,
})
class HostComponent {
  href: string | undefined = '/docs';
  target: string | undefined = undefined;
  ariaLabel: string | undefined = undefined;
  variant = 'primary';
  size = 'inherit';
  underline: 'always' | 'hover' | 'none' = 'hover';
  external: boolean | undefined = undefined;
  disabled = false;
  label = 'Click';
}

describe('KjLinkComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <a> with the .kj-link class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a).not.toBeNull();
  });

  test('forwards kjHref to the inner anchor href', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.href = '/docs/components/link';
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.getAttribute('href')).toBe('/docs/components/link');
  });

  test('forwards kjVariant to data-variant on inner <a>', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'destructive';
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.getAttribute('data-variant')).toBe('destructive');
  });

  test('forwards kjSize to data-size on inner <a>', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.size = 'sm';
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.getAttribute('data-size')).toBe('sm');
  });

  test('forwards kjUnderline to data-underline on inner <a>', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.underline = 'always';
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.getAttribute('data-underline')).toBe('always');
  });

  test('forwards kjTarget to the inner <a> target attribute', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.href = 'https://example.com';
    fixture.componentInstance.target = '_blank';
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.getAttribute('target')).toBe('_blank');
  });

  test('kjExternal=true forces external treatment (data-external="true")', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.href = 'https://example.com';
    fixture.componentInstance.external = true;
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.getAttribute('data-external')).toBe('true');
  });

  test('external link injects rel="noopener noreferrer" (additive)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.href = 'https://example.com';
    fixture.componentInstance.external = true;
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    const rel = (a.getAttribute('rel') ?? '').split(/\s+/u).filter(Boolean);
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  });

  test('external link gets the AT suffix span', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.href = 'https://example.com';
    fixture.componentInstance.external = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    const suffix = a.querySelector('.kj-link-external-suffix');
    expect(suffix).not.toBeNull();
    expect(suffix!.textContent).toContain('opens in new tab');
  });

  test('forwards kjDisabled bundle (aria-disabled, data-disabled, tabindex=-1)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.getAttribute('data-disabled')).toBe('');
    expect(a.getAttribute('tabindex')).toBe('-1');
  });

  test('forwards kjAriaLabel to the inner <a>', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.ariaLabel = 'Open documentation';
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.getAttribute('aria-label')).toBe('Open documentation');
  });

  test('projects content into the inner anchor', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.textContent.trim()).toBe('Click');
  });
});
