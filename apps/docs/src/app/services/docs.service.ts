import { Injectable, PLATFORM_ID, TransferState, inject, makeStateKey, signal } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map, of } from 'rxjs';

export interface InputDef {
  name: string;
  type: string;
  required: boolean;
  isModel: boolean;
  description: string;
  defaultValue?: string;
}

export interface DirectiveDef {
  className: string;
  selector: string;
  exportAs?: string;
  categoryPath: string[];
  description: string;
  inputs: InputDef[];
  examples: string[];
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
  category: 'foundation' | 'overlay' | 'data' | 'charts' | 'a11y' | 'primitives';
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

const MANIFEST_KEY = makeStateKey<DocsManifest>('docs-manifest');

/**
 * Provides access to docs data extracted from @kouji-ui/core at build time.
 *
 * Data flow:
 * - Server/prerender: reads static docs-manifest.json directly (no HTTP), stores in TransferState.
 * - Browser hydration: reads TransferState embedded in the prerendered HTML (no HTTP re-fetch).
 * - Runtime API (/api/docs/*) is available separately via server.ts for external tooling.
 */
@Injectable({ providedIn: 'root' })
export class DocsService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);

  private _manifest: DocsManifest | null = null;

  readonly components = signal<ComponentDoc[]>([]);

  constructor() {
    if (isPlatformServer(this.platformId)) {
      // Server/prerender: import JSON synchronously — no HTTP request needed.
      // The extract-docs script generates this file before ng build runs.
      try {
        // Dynamic require so the browser bundle never includes this path.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const raw = require('../../assets/docs-manifest.json') as DocsManifest;
        this._manifest = raw;
        this.components.set(raw.components);
        this.transferState.set(MANIFEST_KEY, raw);
      } catch {
        // manifest not yet generated — will be empty until extract-docs runs
      }
    } else if (this.transferState.hasKey(MANIFEST_KEY)) {
      // Browser: read from TransferState embedded in the prerendered HTML.
      this._manifest = this.transferState.get(MANIFEST_KEY, null);
      if (this._manifest) {
        this.components.set(this._manifest.components);
      }
    }
  }

  /**
   * Ensures the manifest is loaded. Returns immediately if already available.
   * Falls back to the API for browser-only scenarios (e.g. dev without prerender).
   */
  loadManifest() {
    if (this._manifest) return of(this._manifest);

    return this.http.get<DocsManifest>('/api/docs/manifest').pipe(
      map(manifest => {
        this._manifest = manifest;
        this.components.set(manifest.components);
        return manifest;
      })
    );
  }

  /** Get a component by slug. */
  getComponent(slug: string): ComponentDoc | null {
    return this._manifest?.components.find(c => c.slug === slug) ?? null;
  }

  /** Get components filtered by category. */
  byCategory(category: ComponentDoc['category']): ComponentDoc[] {
    return this._manifest?.components.filter(c => c.category === category) ?? [];
  }

  /** Builds the sidebar navigation tree from component categoryPath values. */
  getSidebarTree(): SidebarNode[] {
    const components = this._manifest?.components ?? [];
    const tree: Record<string, SidebarNode> = {};

    for (const comp of components) {
      const path = comp.categoryPath.length
        ? comp.categoryPath
        : [comp.category.charAt(0).toUpperCase() + comp.category.slice(1), comp.name];

      const topLevel = path[0];
      if (!tree[topLevel]) {
        tree[topLevel] = { label: topLevel, slug: null, children: [] };
      }
      tree[topLevel].children.push({
        label: path[path.length - 1] || comp.name,
        slug: comp.slug,
        children: [],
      });
    }

    return Object.values(tree);
  }
}
