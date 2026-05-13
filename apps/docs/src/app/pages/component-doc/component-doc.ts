import { ApplicationRef, Component, computed, inject, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, filter, take } from 'rxjs/operators';
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
import { KjCardComponent } from '@kouji-ui/components';
import { KjTagComponent } from '@kouji-ui/components';
import { KjLinkComponent } from '@kouji-ui/components';
import { DocsService } from '../../services/docs.service';
import type { DocItem, DocPage } from '../../services/docs.service';
import type {
  CalloutKind,
  ExampleBucket,
  ExampleFile,
  PageExample,
} from '../../../lib/docs-extractor.types';
import { CodePreviewComponent } from '../../components/code-preview/code-preview';
import { PageTocDirective } from '../../components/page-toc/page-toc.directive';
import { PageTocComponent } from '../../components/page-toc/page-toc';

/** Order of bucket sections rendered in the Examples tab. */
const BUCKET_ORDER: ExampleBucket[] = ['playground', 'variants', 'sizes', 'states', 'recipe'];

/** Display label shown as the bucket section heading. */
const BUCKET_LABEL: Record<ExampleBucket, string> = {
  playground: 'Playground',
  variants: 'Variants',
  sizes: 'Sizes',
  states: 'States',
  recipe: 'Recipes',
};

/** Maps Callout.kind to a kj-alert variant. */
const CALLOUT_VARIANT: Record<CalloutKind, 'info' | 'success' | 'warning' | 'error'> = {
  note: 'info',
  info: 'info',
  warning: 'warning',
  danger: 'error',
};

interface BucketGroup {
  bucket: ExampleBucket;
  label: string;
  examples: PageExample[];
}

@Component({
  selector: 'app-component-doc',
  standalone: true,
  imports: [
    RouterLink,
    CodePreviewComponent,
    PageTocDirective,
    PageTocComponent,
    KjTabsComponent,
    KjTabListComponent,
    KjTabComponent,
    KjTabPanelComponent,
    KjAlertComponent,
    KjAlertTitleComponent,
    KjAlertDescriptionComponent,
    KjCardComponent,
    KjTagComponent,
    KjLinkComponent,
  ],
  templateUrl: './component-doc.html',
  styleUrl: './component-doc.css',
})
export class ComponentDocComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly docs = inject(DocsService);
  private readonly appRef = inject(ApplicationRef);

  protected readonly page = toSignal(
    this.route.url.pipe(
      switchMap((segs) => {
        // /docs/headless/<name> or /docs/components/<name>
        const trackId = segs[0]?.path === 'components' ? ('components' as const)
                     : segs[0]?.path === 'headless'   ? ('core' as const)
                     : undefined;
        const name = segs[1]?.path ?? '';
        return this.docs.loadManifest().pipe(map(() => this.docs.getPage(name, trackId)));
      }),
    ),
  );

  private readonly pageToc = viewChild(PageTocDirective);

  /** The page's main item — carries the Docs-page metadata. */
  protected readonly main = computed<DocItem | null>(() => {
    const p = this.page();
    if (!p) return null;
    return p.definitions.find((d) => d.id === p.mainItemId) ?? p.definitions[0] ?? null;
  });

  /** Flattened example entries on the page. */
  protected readonly pageExamples = computed<PageExample[]>(() => this.page()?.examples ?? []);

  /** Pre-grouped examples for the Examples tab — empty groups elided. */
  protected readonly bucketGroups = computed<BucketGroup[]>(() => {
    const examples = this.pageExamples();
    return BUCKET_ORDER
      .map((bucket) => ({
        bucket,
        label: BUCKET_LABEL[bucket],
        examples: examples.filter((e) => e.example.bucket === bucket),
      }))
      .filter((g) => g.examples.length > 0);
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

  /**
   * Minimal usage snippet: first 10–12 lines of the playground example's `.ts`
   * file. Prefers an example whose `slug` matches the page name; otherwise the
   * first playground example; otherwise the first example overall.
   */
  protected readonly minimalUsage = computed<string>(() => {
    const examples = this.pageExamples();
    const p = this.page();
    if (!examples.length || !p) return '';
    const playgrounds = examples.filter((e) => e.example.bucket === 'playground');
    const chosen =
      playgrounds.find((e) => e.example.slug === p.name)
      ?? playgrounds[0]
      ?? examples[0];
    if (!chosen) return '';
    const themed = chosen.example.themedFiles;
    const files: ExampleFile[] = themed['default'] ?? Object.values(themed)[0] ?? [];
    const tsFile = files.find((f) => f.lang === 'ts') ?? files[0];
    if (!tsFile) return '';
    return tsFile.content.split('\n').slice(0, 12).join('\n');
  });

  /** Whether to render the A11y tab body — false when every a11y field is empty. */
  protected readonly hasA11y = computed<boolean>(() => {
    const m = this.main();
    if (!m) return false;
    return !!(
      (m.keyboard && m.keyboard.length)
      || (m.aria && m.aria.length)
      || m.touchTarget
      || m.a11yProse
    );
  });

  /** Whether any callout / prereq prose / import override should render. */
  protected readonly hasCallouts = computed<boolean>(() => !!this.main()?.callouts?.length);
  protected readonly hasPrereqs = computed<boolean>(() => !!this.main()?.prereqs);

  /** Convert a Callout.kind to the kj-alert variant. */
  protected calloutVariant(kind: CalloutKind): string {
    return CALLOUT_VARIANT[kind] ?? 'info';
  }

  /** Build the route segment for related cards (`/docs/<track>/<slug>`). */
  protected relatedHref(slug: string, pkg: DocPage['pkg']): string {
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
    return (d?.inputs.length ?? 0)
      + (d?.models.length ?? 0)
      + (d?.outputs.length ?? 0)
      + (s?.methods.length ?? 0)
      + (s?.properties.length ?? 0)
      + (f?.parameters.length ?? 0);
  });

  protected readonly examplesCount = computed<number>(() => this.pageExamples().length);

  constructor() {
    toObservable(this.page).pipe(
      filter(Boolean),
      switchMap(() => this.appRef.isStable.pipe(filter(Boolean), take(1))),
    ).subscribe(() => this.pageToc()?.refresh());
  }
}
