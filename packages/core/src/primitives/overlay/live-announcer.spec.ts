import { TestBed } from '@angular/core/testing';
import { describe, it, expect, afterEach } from 'vitest';
import { KjLiveAnnouncerService } from './live-announcer';

describe('KjLiveAnnouncerService', () => {
  afterEach(() => {
    document.querySelectorAll('[data-kj-live-region]').forEach(el => el.remove());
  });

  it('announce polite creates a polite live region and writes message', async () => {
    const svc = TestBed.inject(KjLiveAnnouncerService);
    svc.announce('Hello', 'polite');
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    const region = document.querySelector('[data-kj-live-region="polite"]') as HTMLElement;
    expect(region).toBeTruthy();
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toBe('Hello');
  });

  it('announce assertive uses the assertive region', async () => {
    const svc = TestBed.inject(KjLiveAnnouncerService);
    svc.announce('Boom', 'assertive');
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    const region = document.querySelector('[data-kj-live-region="assertive"]') as HTMLElement;
    expect(region.getAttribute('aria-live')).toBe('assertive');
    expect(region.textContent).toBe('Boom');
  });

  it('regions are visually hidden but in the DOM', async () => {
    const svc = TestBed.inject(KjLiveAnnouncerService);
    svc.announce('x', 'polite');
    await new Promise(r => requestAnimationFrame(() => r(undefined)));
    const region = document.querySelector('[data-kj-live-region="polite"]') as HTMLElement;
    expect(region.getAttribute('aria-atomic')).toBe('true');
    expect(region.style.position).toBe('absolute');
  });
});
