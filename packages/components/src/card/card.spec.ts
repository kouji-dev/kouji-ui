import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjCard, KjCardContent } from './card';

@Component({
  standalone: true,
  imports: [KjCard],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-card [variant]="variant">Content</kj-card>`,
})
class HostComponent {
  variant: 'default' | 'outline' | 'subtle' = 'default';
}

describe('KjCard', () => {
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

/** arch F-2 — `padded` accepts the bare-attribute form and `[padded]="false"` still wins. */
describe('kj-card-content padded', () => {
  @Component({
    standalone: true,
    imports: [KjCardContent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
      <kj-card-content id="bare" padded>a</kj-card-content>
      <kj-card-content id="off" [padded]="false">b</kj-card-content>
      <kj-card-content id="default">c</kj-card-content>
    `,
  })
  class PaddedHost {}

  test('reflects data-padded for the bare attribute and the default, not for [padded]="false"', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [PaddedHost] });
    const fixture = TestBed.createComponent(PaddedHost);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('#bare')!.hasAttribute('data-padded')).toBe(true);
    expect(root.querySelector('#default')!.hasAttribute('data-padded')).toBe(true);
    expect(root.querySelector('#off')!.hasAttribute('data-padded')).toBe(false);
  });
});
