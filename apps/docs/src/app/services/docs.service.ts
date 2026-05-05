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

  /**
   * Catalog of styled components shipped from `@kouji-ui/components`.
   * Hardcoded for now; once the manifest extractor scans the components
   * package too, this becomes an extracted list. Wave 1 ships 5 components.
   */
  getStyledComponentsTree(): SidebarNode[] {
    return [
      {
        label: 'Base',
        slug: null,
        children: [
          { label: 'Button', slug: 'button', children: [] },
          { label: 'Card',   slug: 'card',   children: [] },
          { label: 'Link',   slug: 'link',   children: [] },
          { label: 'Kbd',    slug: 'kbd',    children: [] },
        ],
      },
      {
        label: 'Inputs',
        slug: null,
        children: [
          { label: 'Input', slug: 'input', children: [] },
        ],
      },
    ];
  }

  /** Slug list for the styled components track — used by the route prerenderer. */
  getStyledComponentSlugs(): string[] {
    return this.getStyledComponentsTree()
      .flatMap(cat => cat.children)
      .map(item => item.slug)
      .filter((s): s is string => !!s);
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
