import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjBadgeComponent } from './badge';

@Component({
  standalone: true,
  imports: [KjBadgeComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-badge [variant]="variant" [dot]="dot" [bg]="bg" [fg]="fg" [dotColor]="dotColor">Chip</kj-badge>`,
})
class HostComponent {
  variant = 'secondary';
  dot = false;
  bg = '';
  fg = '';
  dotColor = '';
}

describe('KjBadgeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders the inner badge span with the variant', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('kj-badge .kj-badge');
    expect(span).not.toBeNull();
    expect(span.getAttribute('data-variant')).toBe('secondary');
  });

  test('omits custom colour styles when unset', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('kj-badge .kj-badge');
    expect(span.style.getPropertyValue('--kj-badge-bg')).toBe('');
    expect(span.style.getPropertyValue('--kj-badge-fg')).toBe('');
  });

  test('applies bg / fg / dotColor as inline custom properties', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.dot = true;
    fixture.componentInstance.bg = 'rgb(1, 2, 3)';
    fixture.componentInstance.fg = 'var(--some-token)';
    fixture.componentInstance.dotColor = 'rgb(9, 9, 9)';
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('kj-badge .kj-badge');
    expect(span.style.getPropertyValue('--kj-badge-bg')).toBe('rgb(1, 2, 3)');
    expect(span.style.getPropertyValue('--kj-badge-fg')).toBe('var(--some-token)');
    expect(span.style.getPropertyValue('--kj-badge-dot-color')).toBe('rgb(9, 9, 9)');
    expect(span.hasAttribute('data-dot')).toBe(true);
  });
});
