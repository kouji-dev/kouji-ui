import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjCardComponent } from './card';

@Component({
  standalone: true,
  imports: [KjCardComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-card [variant]="variant">Content</kj-card>`,
})
class HostComponent {
  variant: 'default' | 'outline' | 'subtle' = 'default';
}

describe('KjCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('host element carries the .kj-card class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('kj-card');
    expect(card).not.toBeNull();
    expect(card.classList.contains('kj-card')).toBe(true);
  });

  test('default variant has data-variant="default" attr', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('kj-card');
    expect(card.getAttribute('data-variant')).toBe('default');
  });

  test('forwards variant input to data-variant attr', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'outline';
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('kj-card');
    expect(card.getAttribute('data-variant')).toBe('outline');
  });

  test('projects content into the host', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('kj-card');
    expect(card.textContent.trim()).toBe('Content');
  });
});
