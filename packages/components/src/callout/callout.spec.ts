import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjCalloutComponent } from './callout';

@Component({
  standalone: true,
  imports: [KjCalloutComponent],
  template: `<kj-callout [variant]="variant"><strong>Tip:</strong> Body</kj-callout>`,
})
class HostComponent {
  variant: 'info' | 'success' | 'warning' | 'destructive' = 'info';
}

describe('KjCalloutComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <div> with the .kj-callout class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const callout = fixture.nativeElement.querySelector('kj-callout div.kj-callout');
    expect(callout).not.toBeNull();
  });

  test('inner div has role="note" for a11y', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const callout = fixture.nativeElement.querySelector('kj-callout div.kj-callout');
    expect(callout.getAttribute('role')).toBe('note');
  });

  test('default variant is info', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const callout = fixture.nativeElement.querySelector('kj-callout div.kj-callout');
    expect(callout.getAttribute('data-variant')).toBe('info');
  });

  test('forwards variant input to data-variant attr', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'warning';
    fixture.detectChanges();
    const callout = fixture.nativeElement.querySelector('kj-callout div.kj-callout');
    expect(callout.getAttribute('data-variant')).toBe('warning');
  });

  test('projects content into the inner div', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const callout = fixture.nativeElement.querySelector('kj-callout div.kj-callout');
    expect(callout.textContent.trim()).toContain('Tip:');
    expect(callout.textContent.trim()).toContain('Body');
  });
});
