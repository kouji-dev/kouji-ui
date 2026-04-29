import { Injectable, signal } from '@angular/core';
import manifest from '../../assets/docs-manifest.json';

export interface InputDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string;
}

export interface DirectiveDef {
  className: string;
  selector: string;
  description: string;
  inputs: InputDef[];
  examples: string[];
}

export interface ComponentDoc {
  name: string;
  slug: string;
  category: 'foundation' | 'overlay' | 'data' | 'charts' | 'a11y' | 'primitives';
  description: string;
  directives: DirectiveDef[];
}

export interface DocsManifest {
  generatedAt: string;
  components: ComponentDoc[];
}

const MANIFEST = manifest as DocsManifest;

/**
 * Provides access to the docs manifest generated at build time by ts-morph.
 * Data is imported statically — no HTTP requests, no async loading.
 */
@Injectable({ providedIn: 'root' })
export class DocsService {
  /** All components from the manifest. */
  readonly components = signal<ComponentDoc[]>(MANIFEST.components);

  /** Get a single component by slug. Returns null if not found. */
  getComponent(slug: string): ComponentDoc | null {
    return MANIFEST.components.find(c => c.slug === slug) ?? null;
  }

  /** Get all components for a given category. */
  byCategory(category: ComponentDoc['category']): ComponentDoc[] {
    return MANIFEST.components.filter(c => c.category === category);
  }

  /** All component slugs (for route generation). */
  static getSlugs(): string[] {
    return (manifest as DocsManifest).components.map(c => c.slug);
  }
}
