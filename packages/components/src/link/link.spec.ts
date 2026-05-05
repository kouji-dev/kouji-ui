import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjLinkComponent } from './link';

@Component({
  standalone: true,
  imports: [KjLinkComponent],
  template: `<kj-link [href]="href" [variant]="variant" [external]="external">Click</kj-link>`,
})
class HostComponent {
  href = '/docs';
  variant: 'default' | 'subtle' | 'nav' = 'default';
  external = false;
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

  test('forwards href input', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.href = '/docs/components/button';
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.getAttribute('href')).toBe('/docs/components/button');
  });

  test('forwards variant input to data-variant attr', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'nav';
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.getAttribute('data-variant')).toBe('nav');
  });

  test('external sets target=_blank and rel=noopener', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.external = true;
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener');
  });

  test('non-external links omit target and rel', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.external = false;
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.getAttribute('target')).toBeNull();
    expect(a.getAttribute('rel')).toBeNull();
  });

  test('projects content into the inner anchor', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('kj-link a.kj-link');
    expect(a.textContent.trim()).toBe('Click');
  });
});
