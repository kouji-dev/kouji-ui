import { Injectable, inject, signal } from '@angular/core';
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
  required?: boolean;
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
  /** Source package — 'core' for headless directives, 'components' for styled wrappers. */
  pkg: 'core' | 'components';
  categoryPath: string[];
  category:
    | 'actions' | 'data-input' | 'data-display' | 'navigation' | 'feedback'
    | 'base' | 'inputs' | 'overlays' | 'data' | 'display' | 'a11y' | 'primitives';
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

/**
 * A docs track — a top-level grouping in the sidebar that drills into a tree.
 * `id` is the URL segment (matches `/docs/<id>/<slug>` routes); `packageName`
 * is the display label, sourced from the underlying package's package.json
 * `name` field (or an override later, when extracted metadata is available).
 */
export interface DocsTrack {
  id: string;
  packageName: string;
  /** Editorial title shown on track cards. */
  title: string;
  /** One-sentence tagline shown under the title. */
  tagline: string;
  tree: SidebarNode[];
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
   *
   * Returns the cached manifest synchronously when available (set in the
   * constructor from TransferState in the browser, or from ServerDocsManifestProvider
   * during SSR). Falls back to an HTTP fetch only when `_manifest` is null.
   *
   * Dev mode used to always re-fetch so the SPA picked up new components without
   * a full refresh, but that caused a "Component not found" flicker on every doc
   * page load while the fetch was in flight. A manual refresh after editing
   * components is the standard Angular dev workflow — accepted tradeoff.
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

  /** Returns all CORE component slugs — used in `getPrerenderParams()` for /docs/headless/:slug. */
  getSlugs(): string[] {
    return (this._manifest?.components ?? [])
      .filter(c => c.pkg === 'core')
      .map(c => c.slug);
  }

  /**
   * Get a component by slug — optionally scoped to a package so the same
   * slug (e.g. 'button') in both packages doesn't collide.
   */
  getComponent(slug: string, pkg?: 'core' | 'components'): ComponentDoc | null {
    const components = this._manifest?.components ?? [];
    const matches = components.filter(c => c.slug === slug);
    if (!matches.length) return null;
    if (pkg) return matches.find(c => c.pkg === pkg) ?? null;
    return matches[0] ?? null;
  }

  /** Get components filtered by category. */
  byCategory(category: ComponentDoc['category']): ComponentDoc[] {
    return this._manifest?.components.filter(c => c.category === category) ?? [];
  }

  /** Builds a 3-level nested category tree: Package > Category > Component */
  getSidebarTree(): SidebarNode[] {
    return this.buildTreeForPackage('core');
  }

  /** Builds the styled-components tree from the manifest (filtered to pkg='components'). */
  getStyledComponentsTree(): SidebarNode[] {
    return this.buildTreeForPackage('components');
  }

  private buildTreeForPackage(pkg: 'core' | 'components'): SidebarNode[] {
    const components = (this._manifest?.components ?? []).filter(c => c.pkg === pkg);
    const tree: Record<string, Record<string, SidebarNode[]>> = {};

    for (const comp of components) {
      const path = comp.categoryPath;
      // Derive the category label shown in the sidebar:
      // - 'Core/Navigation/Accordion' → 'Navigation' (drop package prefix + redundant comp name)
      // - 'Core/Base'                 → 'Base'        (drop package prefix)
      // - 'Core'                      → 'Core'        (single segment — show as-is)
      // - (empty)                     → 'Others'
      let cat: string;
      if (path.length >= 3) {
        cat = path[path.length - 2];
      } else if (path.length === 2) {
        cat = path[1];
      } else {
        cat = path[0] ?? 'Others';
      }

      if (!tree['root']) tree['root'] = {};
      if (!tree['root'][cat]) tree['root'][cat] = [];
      tree['root'][cat].push({ label: comp.name, slug: comp.slug, children: [] });
    }

    return Object.entries(tree['root'] ?? {}).map(([cat, items]) => ({
      label: cat,
      slug: null,
      children: items,
    }));
  }

  /** Slug list for the styled components track — used by the route prerenderer. */
  getStyledComponentSlugs(): string[] {
    return (this._manifest?.components ?? [])
      .filter(c => c.pkg === 'components')
      .map(c => c.slug);
  }

  /**
   * The list of docs tracks the sidebar drills into.
   * `id` is the URL segment; `packageName` is the display label sourced from
   * each package's package.json (will be replaceable by an extracted override
   * once the metadata extractor reads the components package too).
   */
  getTracks(): DocsTrack[] {
    return [
      {
        id: 'headless',
        packageName: 'core',
        title: 'Headless primitives',
        tagline: 'Behavior-only directives. Bring your own CSS. Zero opinions, full a11y.',
        tree: this.getSidebarTree(),
      },
      {
        id: 'components',
        packageName: 'components',
        title: 'Styled components',
        tagline: 'Opinionated, themable element wrappers built on the headless directives.',
        tree: this.getStyledComponentsTree(),
      },
    ];
  }
}
