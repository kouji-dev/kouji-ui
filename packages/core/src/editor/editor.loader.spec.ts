import { EnvironmentInjector, Injector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KjEditorLoader } from './editor.loader';
import { KJ_MONACO_CONFIG } from './editor.tokens';
import type { KjMonaco, KjMonacoLoaderFn } from './editor.types';

const roots: EnvironmentInjector[] = [];

/** A loader in its own root injector — what a second Angular application has. */
function loaderWith(loader: KjMonacoLoaderFn): KjEditorLoader {
  const injector = createEnvironmentInjector(
    [KjEditorLoader, { provide: KJ_MONACO_CONFIG, useValue: { loader } }],
    TestBed.inject(Injector) as never,
  );
  roots.push(injector);
  return injector.get(KjEditorLoader);
}

const globalMonaco = (): KjMonaco | undefined =>
  (window as unknown as { monaco?: KjMonaco }).monaco;

function setGlobalMonaco(value: KjMonaco | undefined): void {
  if (value) (window as unknown as { monaco?: KjMonaco }).monaco = value;
  else delete (window as unknown as { monaco?: KjMonaco }).monaco;
}

describe('KjEditorLoader', () => {
  afterEach(() => {
    while (roots.length) roots.pop()!.destroy();
    setGlobalMonaco(undefined);
    document.documentElement.removeAttribute('data-kj-monaco');
  });

  it('memoises within one injector', async () => {
    const monaco = {} as KjMonaco;
    const load = vi.fn(async () => monaco);
    const loader = loaderWith(load);
    expect(await loader.load()).toBe(monaco);
    expect(await loader.load()).toBe(monaco);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('a second loader reuses the page-global Monaco the first installed (mfe F-13)', async () => {
    const monaco = {} as KjMonaco;
    // Stands in for `@monaco-editor/loader`, whose whole job is to set up the
    // page-global AMD `require` and publish `window.monaco`.
    const first = vi.fn(async () => {
      setGlobalMonaco(monaco);
      return monaco;
    });
    const second = vi.fn(async () => ({}) as KjMonaco);

    expect(await loaderWith(first).load()).toBe(monaco);
    expect(document.documentElement.hasAttribute('data-kj-monaco')).toBe(true);

    expect(await loaderWith(second).load()).toBe(monaco);
    expect(second).not.toHaveBeenCalled();
  });

  it('never captures a window.monaco this library did not install', async () => {
    // An app that hand-loads Monaco owns its own global; silently adopting it
    // would hand the consumer a build they did not configure here.
    setGlobalMonaco({} as KjMonaco);
    const own = {} as KjMonaco;
    const load = vi.fn(async () => own);
    expect(await loaderWith(load).load()).toBe(own);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('clears the memo when loading fails so a later call retries', async () => {
    const monaco = {} as KjMonaco;
    let attempt = 0;
    const load = vi.fn(async () => {
      if (attempt++ === 0) throw new Error('offline');
      return monaco;
    });
    const loader = loaderWith(load);
    await expect(loader.load()).rejects.toThrow('offline');
    expect(await loader.load()).toBe(monaco);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not mark the document when the loader is a bundled module', async () => {
    // `() => import('monaco-editor')` never touches the page global, so there
    // is nothing page-wide to share and nothing to mark.
    const load = vi.fn(async () => ({}) as KjMonaco);
    await loaderWith(load).load();
    expect(document.documentElement.hasAttribute('data-kj-monaco')).toBe(false);
    expect(globalMonaco()).toBeUndefined();
  });
});
