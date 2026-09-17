import { EnvironmentInjector, Injector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KJ_ID_NAMESPACE, KjId, mintKjId } from './id';

/**
 * Two applications sharing one document, each with its own root injector.
 * A `TestBed` root plus detached environment injectors is the closest a jsdom
 * spec gets to two `bootstrapApplication` calls, and it exercises the same
 * code path: one `KjId` instance per root.
 */
const extraRoots: EnvironmentInjector[] = [];

function rootWithNamespace(namespace: string): Injector {
  const injector = createEnvironmentInjector(
    // `KjId` is `providedIn: 'root'`, so a child injector only gets its own
    // instance — the thing a second application would have — when it provides
    // the class itself.
    [KjId, { provide: KJ_ID_NAMESPACE, useValue: namespace }],
    TestBed.inject(Injector) as never,
  );
  extraRoots.push(injector);
  return injector;
}

describe('KjId', () => {
  beforeEach(() => {
    // The live-root refcount is on <html>, which vitest shares across tests.
    document.documentElement.removeAttribute('data-kj-id-roots');
  });

  afterEach(() => {
    while (extraRoots.length) extraRoots.pop()!.destroy();
    document.documentElement.removeAttribute('data-kj-id-roots');
    vi.restoreAllMocks();
  });

  it('mints unique ids with default prefix', () => {
    const svc = TestBed.inject(KjId);
    expect(svc.mint()).not.toBe(svc.mint());
  });

  it('honours custom prefix', () => {
    const svc = TestBed.inject(KjId);
    expect(svc.mint('panel')).toMatch(/^kj-panel-\d+$/);
  });

  it('produces deterministic sequence within an injector', () => {
    const svc = TestBed.inject(KjId);
    const a = svc.mint('x');
    const b = svc.mint('x');
    const aN = Number(a.split('-').at(-1));
    const bN = Number(b.split('-').at(-1));
    expect(bN).toBe(aN + 1);
  });

  it('counts each prefix separately, so a new call site never renumbers another feature', () => {
    const svc = TestBed.inject(KjId);
    expect(svc.mint('field')).toBe('kj-field-1');
    expect(svc.mint('panel')).toBe('kj-panel-1');
    expect(svc.mint('field')).toBe('kj-field-2');
  });

  it('two Angular roots on one page mint disjoint ids (mfe F-1 / overlay F-12)', () => {
    const shell = rootWithNamespace('shell');
    const remote = rootWithNamespace('remote');

    const shellIds = [1, 2, 3].map(() => shell.get(KjId).mint('field'));
    const remoteIds = [1, 2, 3].map(() => remote.get(KjId).mint('field'));

    // Same sequence numbers — disjoint ids, because the namespace differs.
    expect(shellIds).toEqual(['kj-field-1-shell', 'kj-field-2-shell', 'kj-field-3-shell']);
    expect(remoteIds).toEqual(['kj-field-1-remote', 'kj-field-2-remote', 'kj-field-3-remote']);
    expect(new Set([...shellIds, ...remoteIds]).size).toBe(6);
  });

  it('leaves ids untouched with no namespace, so a single app keeps SSR-stable ids', () => {
    expect(TestBed.inject(KjId).namespace).toBe('');
    expect(TestBed.inject(KjId).mint('field')).toMatch(/^kj-field-\d+$/);
  });

  it('warns in dev when a second root mints without a namespace', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // First minter of this injector tree.
    TestBed.inject(KjId);
    const second = createEnvironmentInjector([KjId], TestBed.inject(Injector) as never);
    extraRoots.push(second);
    second.get(KjId).mint('field');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('KJ_ID_NAMESPACE'));
  });

  it('does not warn when the second root namespaces itself', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.inject(KjId);
    rootWithNamespace('remote').get(KjId).mint('field');
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('mintKjId', () => {
  it('routes through the injector when called in an injection context', () => {
    const svc = TestBed.inject(KjId);
    const fromService = svc.mint('probe');
    const fromHelper = TestBed.runInInjectionContext(() => mintKjId('probe'));
    const n = (id: string): number => Number(id.split('-').at(-1));
    expect(n(fromHelper)).toBe(n(fromService) + 1);
  });

  it('still mints outside an injection context, without a module-level counter', () => {
    const a = mintKjId('detached');
    const b = mintKjId('detached');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^kj-detached-\d+$/);
  });
});
