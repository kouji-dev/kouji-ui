import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjKbdComponent } from './kbd';

@Component({
  standalone: true,
  imports: [KjKbdComponent],
  template: `<kj-kbd>⌘K</kj-kbd>`,
})
class HostComponent {}

describe('KjKbdComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders an inner <kbd> with the .kj-kbd class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const kbd = fixture.nativeElement.querySelector('kj-kbd kbd.kj-kbd');
    expect(kbd).not.toBeNull();
  });

  test('projects content into the inner kbd', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const kbd = fixture.nativeElement.querySelector('kj-kbd kbd.kj-kbd');
    expect(kbd.textContent.trim()).toBe('⌘K');
  });
});
