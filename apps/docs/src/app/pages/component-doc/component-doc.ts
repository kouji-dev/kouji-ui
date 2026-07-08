import { Component, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map } from 'rxjs/operators';
import { ExampleRegistryService } from '../../services/example-registry.service';
import {
  KjTabsComponent,
  KjTabListComponent,
  KjTabComponent,
  KjTabPanelComponent,
} from '@kouji-ui/components';
import {
  KjAlertComponent,
  KjAlertTitleComponent,
  KjAlertDescriptionComponent,
} from '@kouji-ui/components';
import { KjTagComponent } from '@kouji-ui/components';
import { DocsService } from '../../services/docs.service';
import type { DocItem, DocPage } from '../../services/docs.service';
import type { CalloutKind, PageExample } from '../../../lib/docs-extractor.types';
import { CodePreviewComponent } from '../../components/code-preview/code-preview';
import { KjEditorComponent } from '@kouji-ui/components';
import { PlaygroundComponent } from './playground';
import { PLAYGROUND_FILES } from './playground-files';

/** Maps Callout.kind to a kj-alert variant. */
const CALLOUT_VARIANT: Record<CalloutKind, 'info' | 'success' | 'warning' | 'error'> = {
  note: 'info',
  info: 'info',
  warning: 'warning',
  danger: 'error',
};

@Component({
  selector: 'app-component-doc',
  standalone: true,
  imports: [
    RouterLink,
    CodePreviewComponent,
    KjEditorComponent,
    PlaygroundComponent,
    KjTabsComponent,
    KjTabListComponent,
    KjTabComponent,
    KjTabPanelComponent,
    KjAlertComponent,
    KjAlertTitleComponent,
    KjAlertDescriptionComponent,
    KjTagComponent,
  ],
  templateUrl: './component-doc.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './component-doc.css',
})
export class ComponentDocComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly docs = inject(DocsService);
  private readonly registry = inject(ExampleRegistryService);

  constructor() {
    // Warm every example chunk owned by the current page once we know what
    // the page contains. The registry de-duplicates by folder, so this
    // typically fetches exactly one chunk per page even when the page lists
    // 20 examples. Preload is itself async (returns immediately, fetch
    // continues in the background) so it never blocks anything.
    let warmedFor: string | null = null;
    effect(() => {
      const p = this.page();
      if (!p || warmedFor === p.name) return;
      warmedFor = p.name;
      for (const e of p.examples) {
        for (const file of Object.values(e.example.themedFiles).flat()) {
          if (file.exportName) this.registry.preload(file.exportName);
        }
      }
    });
  }

  protected readonly page = toSignal(
    this.route.url.pipe(
      switchMap((segs) => {
        // /docs/headless/<name> or /docs/components/<name>
        const trackId =
          segs[0]?.path === 'components'
            ? ('components' as const)
            : segs[0]?.path === 'headless'
              ? ('core' as const)
              : undefined;
        const name = segs[1]?.path ?? '';
        // Fall back across tracks so a wrong-track URL (e.g. /docs/components/chart
        // for the headless-only chart) still resolves instead of 404ing.
        return this.docs.loadManifest().pipe(
          map(() => this.docs.getPage(name, trackId) ?? this.docs.getPage(name)),
        );
      }),
    ),
  );

  /** The page's main item — carries the Docs-page metadata. */
  protected readonly main = computed<DocItem | null>(() => {
    const p = this.page();
    if (!p) return null;
    return p.definitions.find((d) => d.id === p.mainItemId) ?? p.definitions[0] ?? null;
  });

  /** Flattened example entries on the page. */
  protected readonly pageExamples = computed<PageExample[]>(() => this.page()?.examples ?? []);

  /**
   * Usage example shown in the Overview tab's Import section. Looks for an
   * example whose slug is `<page>.usage` (e.g. `button.usage`). The first
   * `.ts` file in that example's default themed bundle is rendered live in
   * the code editor. When no usage example exists, the page falls back to
   * the auto-derived `importSnippet`.
   */
  protected readonly usageExample = computed<PageExample | null>(() => {
    const examples = this.pageExamples();
    const p = this.page();
    if (!examples.length || !p) return null;
    const targetSlug = `${p.name}.usage`;
    return examples.find((e) => e.example.slug === targetSlug) ?? null;
  });

  /** Source of the usage `.ts` file rendered in the Overview's Import code editor. */
  protected readonly usageSource = computed<string>(() => {
    const ex = this.usageExample();
    if (!ex) return '';
    const files = ex.example.themedFiles['default'] ?? [];
    const tsFile = files.find((f) => f.lang === 'ts') ?? files[0];
    return tsFile?.content ?? '';
  });

  /**
   * Whether this page has an interactive Playground (a co-located
   * `<comp>.playground.ts` registered in `PLAYGROUND_FILES`). When true, the
   * page's canonical/"Default" example is represented by that interactive
   * stage, so it is hidden from the recipes grid to avoid duplication.
   */
  protected readonly hasInteractivePlayground = computed<boolean>(() => {
    const symbol = this.main()?.symbol;
    return !!(symbol && PLAYGROUND_FILES[symbol]);
  });

  /**
   * Flat list of non-usage examples rendered on the Examples tab. Variants /
   * sizes / states / recipes all live in a single grid — no per-bucket
   * sub-sections, matching design-revamp/docs.jsx `ExamplesTab`. The usage
   * example is hidden from the recipes grid (it owns the Overview code editor
   * instead).
   *
   * Playground-bucket examples (the canonical "Default") are normally hidden
   * here because they render in the interactive Playground. But pages without
   * an interactive playground file have no other place to show that example —
   * so we surface it here instead of silently dropping the component's primary
   * demo (e.g. service-launched overlays like action-sheet, or datetime-picker).
   */
  protected readonly recipeExamples = computed<PageExample[]>(() => {
    const p = this.page();
    const usageSlug = p ? `${p.name}.usage` : '';
    const hidePlayground = this.hasInteractivePlayground();
    return this.pageExamples().filter((e) => {
      if (e.example.slug === usageSlug) return false;
      if (e.example.bucket === 'playground') return !hidePlayground;
      return true;
    });
  });

  /** Auto-derived import snippet — uses `importOverride` when set. */
  protected readonly importSnippet = computed<string>(() => {
    const m = this.main();
    const p = this.page();
    if (!m || !p) return '';
    if (m.importOverride) return m.importOverride;
    const pkg = p.pkg === 'core' ? 'core' : 'components';
    return `import { ${m.symbol} } from '@kouji-ui/${pkg}';`;
  });

  /** Whether to render the A11y tab body — false when every a11y field is empty. */
  protected readonly hasA11y = computed<boolean>(() => {
    const m = this.main();
    if (!m) return false;
    return !!(
      (m.keyboard && m.keyboard.length) ||
      (m.aria && m.aria.length) ||
      m.touchTarget ||
      m.a11yProse
    );
  });

  /** Whether any callout / prereq prose / import override should render. */
  protected readonly hasCallouts = computed<boolean>(() => !!this.main()?.callouts?.length);
  protected readonly hasPrereqs = computed<boolean>(() => !!this.main()?.prereqs);

  /** Convert a Callout.kind to the kj-alert variant. */
  protected calloutVariant(kind: CalloutKind): string {
    return CALLOUT_VARIANT[kind] ?? 'info';
  }

  /**
   * Build the route segment for related cards (`/docs/<track>/<slug>`).
   *
   * Resolves the related item's *actual* track rather than assuming the current
   * page's: prefer the current pkg when the slug exists there, else fall back to
   * wherever it is documented. Without this, a component page relating to the
   * headless-only `chart` linked to `/docs/components/chart` → "Page not found".
   */
  protected relatedHref(slug: string, currentPkg: DocPage['pkg']): string {
    const page = this.docs.getPage(slug, currentPkg) ?? this.docs.getPage(slug);
    const pkg = page?.pkg ?? currentPkg;
    const track = pkg === 'core' ? 'headless' : 'components';
    return `/docs/${track}/${slug}`;
  }

  /** Tab count badges. */
  protected readonly apiCount = computed<number>(() => {
    const m = this.main();
    if (!m) return 0;
    const d = m.directive;
    const s = m.service;
    const f = m.function;
    return (
      (d?.inputs.length ?? 0) +
      (d?.models.length ?? 0) +
      (d?.outputs.length ?? 0) +
      (s?.methods.length ?? 0) +
      (s?.properties.length ?? 0) +
      (f?.parameters.length ?? 0)
    );
  });

  protected readonly examplesCount = computed<number>(() => this.recipeExamples().length);

  /**
   * Position of the CSS-variables section within the API tab — directives
   * occupy `01..03` (Inputs/Models/Outputs), services occupy `01..02`
   * (Methods/Properties), etc. CSS vars always land just after.
   */
  protected readonly cssVarsSectionNum = computed<string>(() => {
    const m = this.main();
    if (!m) return '01';
    let occupied = 0;
    if (m.directive) {
      if (m.directive.inputs.length) occupied += 1;
      if (m.directive.models.length) occupied += 1;
      if (m.directive.outputs.length) occupied += 1;
    }
    if (m.service) {
      if (m.service.methods.length) occupied += 1;
      if (m.service.properties.length) occupied += 1;
    }
    if (m.function) occupied += 1;
    if (m.token) occupied += 1;
    if (m.typeAlias) occupied += 1;
    if (m.const) occupied += 1;
    return String(occupied + 1).padStart(2, '0');
  });
}
