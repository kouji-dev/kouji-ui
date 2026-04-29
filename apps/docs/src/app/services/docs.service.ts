import { Injectable, TransferState, inject, makeStateKey, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  category: 'foundation' | 'overlay' | 'data' | 'charts' | 'a11y' | 'primitives';
  description: string;
  directives: DirectiveDef[];
  tokens: TokenDef[];
  typeAliases: TypeAliasDef[];
}

export interface DocsManifest {
  generatedAt: string;
  components: ComponentDoc[];
}

const MANIFEST_KEY = makeStateKey<DocsManifest>('docs-manifest');

/**
 * Provides access to docs data.
 * On the server: fetches from /api/docs/manifest and stores in TransferState.
 * On the browser: reads from TransferState (embedded in prerendered HTML) — no HTTP request.
 */
@Injectable({ providedIn: 'root' })
export class DocsService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);

  private _manifest: DocsManifest | null = null;

  readonly components = signal<ComponentDoc[]>([]);

  constructor() {
    // If prerendered, TransferState has the manifest embedded in the HTML
    if (this.transferState.hasKey(MANIFEST_KEY)) {
      this._manifest = this.transferState.get(MANIFEST_KEY, null);
      if (this._manifest) {
        this.components.set(this._manifest.components);
      }
    }
  }

  /** Load manifest. Uses TransferState on browser, fetches from API on server. */
  loadManifest() {
    if (this._manifest) return of(this._manifest);

    return this.http.get<DocsManifest>('/api/docs/manifest').pipe(
      map(manifest => {
        this._manifest = manifest;
        this.components.set(manifest.components);
        // Store in TransferState so browser hydration doesn't re-fetch
        if (!isPlatformBrowser(this.platformId)) {
          this.transferState.set(MANIFEST_KEY, manifest);
        }
        return manifest;
      })
    );
  }

  /** Get a component by slug from the cached manifest. */
  getComponent(slug: string): ComponentDoc | null {
    return this._manifest?.components.find(c => c.slug === slug) ?? null;
  }

  /** Get components by category. */
  byCategory(category: ComponentDoc['category']): ComponentDoc[] {
    return this._manifest?.components.filter(c => c.category === category) ?? [];
  }

  /** All slugs — used by getPrerenderParams at build time. */
  static getSlugs(): string[] {
    // This is only called server-side via getDocsSlugs() now
    return [];
  }
}
