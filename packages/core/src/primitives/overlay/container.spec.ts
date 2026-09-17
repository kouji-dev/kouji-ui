import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { KJ_OVERLAY_CONTAINER, createOverlayWrapper, getOverlayContainer } from './container';

const containers = (): NodeListOf<HTMLElement> =>
  document.body.querySelectorAll<HTMLElement>('[data-kj-overlay-container]');

describe('getOverlayContainer', () => {
  afterEach(() => {
    containers().forEach((el) => el.remove());
  });

  it('creates one container and returns it again', () => {
    const first = getOverlayContainer(document);
    expect(first).not.toBeNull();
    expect(getOverlayContainer(document)).toBe(first);
    expect(containers().length).toBe(1);
  });

  it('adopts a container already in the document rather than adding a second (mfe F-2 / overlay F-12)', () => {
    // Stands in for the root another copy of the library — or a previous
    // module instance whose variable this one cannot see — already appended.
    const seeded = document.createElement('div');
    seeded.className = 'kj-overlay-container';
    seeded.setAttribute('data-kj-overlay-container', '');
    document.body.appendChild(seeded);

    expect(getOverlayContainer(document)).toBe(seeded);
    expect(containers().length).toBe(1);
  });

  it('recreates the container when app code removes it', () => {
    const first = getOverlayContainer(document)!;
    first.remove();
    const second = getOverlayContainer(document);
    expect(second).not.toBe(first);
    expect(second!.isConnected).toBe(true);
  });

  it('returns null without a document', () => {
    expect(getOverlayContainer(null)).toBeNull();
  });

  it('createOverlayWrapper builds in the root own document', () => {
    const root = getOverlayContainer(document)!;
    const wrapper = createOverlayWrapper(root);
    expect(wrapper?.parentElement).toBe(root);
    expect(wrapper?.ownerDocument).toBe(document);
    expect(createOverlayWrapper(null)).toBeNull();
  });
});

describe('KJ_OVERLAY_CONTAINER', () => {
  afterEach(() => {
    containers().forEach((el) => el.remove());
  });

  it('resolves the container through the injected DOCUMENT', () => {
    const resolve = TestBed.inject(KJ_OVERLAY_CONTAINER);
    expect(resolve()).toBe(getOverlayContainer(document));
  });

  it('returns null on a server platform without touching the DOM (ssr F-14)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    expect(TestBed.inject(KJ_OVERLAY_CONTAINER)()).toBeNull();
    expect(containers().length).toBe(0);
  });
});
