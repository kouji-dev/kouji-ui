import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { detectServices } from '../../detectors/service.detector';

function projectWith(src: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile('svc.ts', src);
}

describe('detectServices', () => {
  it('emits a DocItem for an @doc-tagged @Injectable class', () => {
    const sf = projectWith(`
      import { Injectable } from '@angular/core';
      /**
       * Manages icons at runtime.
       * @doc
       * @doc-name icon-registry
       * @doc-is-main
       */
      @Injectable({ providedIn: 'root' })
      export class IconRegistry {
        /** Public count of registered icons. */
        public count = 0;
        /** Register an icon by name. */
        register(name: string, value: string): void {}
        /** @internal */
        _private = 1;
      }
    `);
    const items = detectServices(sf, 'core');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('service');
    expect(items[0].symbol).toBe('IconRegistry');
    const props = items[0].service!.properties.map(p => p.name);
    const methods = items[0].service!.methods.map(m => m.name);
    expect(props).toContain('count');
    expect(props).not.toContain('_private');
    expect(methods).toContain('register');
  });

  it('skips non-@doc services', () => {
    const sf = projectWith(`
      import { Injectable } from '@angular/core';
      @Injectable() export class S {}
    `);
    expect(detectServices(sf, 'core')).toEqual([]);
  });
});
