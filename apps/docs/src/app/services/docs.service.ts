import { Injectable, inject, isDevMode, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, of } from 'rxjs';
import { DocsManifestProvider } from './docs-manifest.provider';

export interface InputDef {
  name: string;
  type: string;
  required: boolean;
  isModel: boolean;
  description: string;
  defaultValue?: string;
}

export interface ExampleFile {
  lang: 'ts' | 'html' | 'css';
  filename: string;
  content: string;
  exportName?: string;
}

export interface DocExample {
  label: string;
  themedFiles: Record<string, ExampleFile[]>;
}

export interface DirectiveDef {
  className: string;
  selector: string;
  exportAs?: string;
  categoryPath: string[];
  description: string;
  inputs: InputDef[];
  examples: string[];
  exampleFiles: ExampleFile[];
  themedExamples: Record<string, ExampleFile[]>;
  docExamples: DocExample[];
}

export interface TokenDef {
  name: string;
  description: string;
}

export interface TypeAliasDef {
  name: string;
  type: string;
  description: string;
}

export interface ComponentDoc {
  name: string;
  slug: string;
  categoryPath: string[];
  category: 'base' | 'inputs' | 'navigation' | 'overlays' | 'data' | 'display' | 'a11y' | 'primitives';
  description: string;
  directives: DirectiveDef[];
  tokens: TokenDef[];
  typeAliases: TypeAliasDef[];
}

export interface SidebarNode {
  label: string;
  slug: string | null;
  children: SidebarNode[];
}

export interface DocsManifest {
  generatedAt: string;
  components: ComponentDoc[];
}

/**
 * Provides access to docs metadata.
 *
 * Data flow:
 * - Server/prerender: `DocsManifestProvider` → `ServerDocsManifestProvider` → `getManifest()` (ts-morph)
 *   → result stored in TransferState for browser hydration.
 * - Browser (prerendered): `DocsManifestProvider` → `BrowserDocsManifestProvider` → reads TransferState.
 * - Browser fallback (dev / non-prerendered): HTTP `GET /api/docs/manifest`.
 */
@Injectable({ providedIn: 'root' })
export class DocsService {
  private readonly http = inject(HttpClient);
  private readonly provider = inject(DocsManifestProvider);

  private _manifest: DocsManifest | null = null;
  readonly components = signal<ComponentDoc[]>([]);

  constructor() {
    const manifest = this.provider.getManifest();
    if (manifest) {
      this._manifest = manifest;
      this.components.set(manifest.components);
    }
  }

  /**
   * Ensures the manifest is loaded.
   * In dev mode always re-fetches so hot-reload picks up changes.
   * In production returns immediately from cache (prerendered via TransferState).
   */
  loadManifest() {
    if (this._manifest && !isDevMode()) return of(this._manifest);

    return this.http.get<DocsManifest>('/api/docs/manifest').pipe(
      map(manifest => {
        this._manifest = manifest;
        this.components.set(manifest.components);
        return manifest;
      })
    );
  }

  /** Returns all component slugs — used in `getPrerenderParams()`. */
  getSlugs(): string[] {
    return this._manifest?.components.map(c => c.slug) ?? this.provider.getSlugs();
  }

  /** Get a component by slug. */
  getComponent(slug: string): ComponentDoc | null {
    return this._manifest?.components.find(c => c.slug === slug) ?? null;
  }

  /** Get components filtered by category. */
  byCategory(category: ComponentDoc['category']): ComponentDoc[] {
    return this._manifest?.components.filter(c => c.category === category) ?? [];
  }

  /** Builds a 3-level nested category tree: Package > Category > Component */
  getSidebarTree(): SidebarNode[] {
    const components = this._manifest?.components ?? [];
    const tree: Record<string, Record<string, SidebarNode[]>> = {};

    for (const comp of components) {
      // Use the second-to-last segment as category (e.g. "Navigation" from "Core/Navigation/Accordion")
      // or the first segment if path has exactly 2 segments ("Navigation" from "Navigation/Accordion")
      // Falls back to "Others" for anything without a valid path.
      const path = comp.categoryPath;
      const cat  = path.length >= 2 ? path[path.length - 2] : 'Others';

      if (!tree['root']) tree['root'] = {};
      if (!tree['root'][cat]) tree['root'][cat] = [];
      tree['root'][cat].push({ label: comp.name, slug: comp.slug, children: [] });
    }

    // Return flat 2-level: Category > Component (no top-level package grouping)
    return Object.entries(tree['root'] ?? {}).map(([cat, items]) => ({
      label: cat,
      slug: null,
      children: items,
    }));
  }
}
