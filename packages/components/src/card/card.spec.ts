import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjCardComponent } from './card';

@Component({
  standalone: true,
  imports: [KjCardComponent],
  template: `<kj-card [variant]="variant">Content</kj-card>`,
})
class HostComponent {
  variant: 'default' | 'outline' | 'subtle' = 'default';
}

describe('KjCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <div> with the .kj-card class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('kj-card div.kj-card');
    expect(card).not.toBeNull();
  });

  test('default variant has data-variant="default" attr', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('kj-card div.kj-card');
    expect(card.getAttribute('data-variant')).toBe('default');
  });

  test('forwards variant input to data-variant attr', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.variant = 'outline';
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('kj-card div.kj-card');
    expect(card.getAttribute('data-variant')).toBe('outline');
  });

  test('projects content into the inner div', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('kj-card div.kj-card');
    expect(card.textContent.trim()).toBe('Content');
  });
});
