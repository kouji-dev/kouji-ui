import {
  Component,
  Type,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { KjEditorComponent } from '@kouji-ui/components';
import { ExampleRegistryService } from '../../services/example-registry.service';
import { PreviewTheme, PREVIEW_THEMES } from '../../services/preview-theme';
import { DocExample } from '../../services/docs.service';

export interface CodeExample {
  lang: 'ts' | 'html' | 'css';
  filename: string;
  content: string;
  exportName?: string;
}

@Component({
  selector: 'kj-code-preview',
  standalone: true,
  imports: [KjEditorComponent],
  templateUrl: './code-preview.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './code-preview.css',
})
export class CodePreviewComponent {
  /** Default example files (used as fallback when no themed examples exist). */
  examples = input<CodeExample[]>([]);

  /** Per-theme example files — keyed by theme name. Overrides `examples` when available. */
  themedExamples = input<Record<string, CodeExample[]>>({});

  /** Named example groups with optional per-theme files. When provided, overrides themedExamples/examples. */
  docExamples = input<DocExample[]>([]);

  /** Component name for StackBlitz project title. */
  componentName = input<string>('Example');

  /**
   * When `true` the component renders only the live demo (no example tabs,
   * theme strip, show-code toggle, file tabs, copy or StackBlitz buttons,
   * and no code editor). Used by the docs page's recipe-cards.
   */
  previewOnly = input<boolean>(false);

  private readonly registrySvc = inject(ExampleRegistryService);

  protected readonly activeTheme = signal<PreviewTheme>('default');
  protected readonly previewThemes = PREVIEW_THEMES;
  protected readonly activeExampleIdx = signal(0);
  protected readonly activeDocExample = computed(
    () => this.docExamples()[this.activeExampleIdx()] ?? null,
  );

  /** Whether the code editor panel is visible. Hidden by default. */
  protected readonly showCode = signal(false);

  protected readonly activeIndex = signal(0);
  protected readonly copied = signal(false);

  /**
   * Active example files for the current theme.
   *
   * When docExamples is provided, uses the active example's themedFiles.
   * Otherwise falls back to legacy themedExamples / examples.
   *
   * Rules:
   * - DEFAULT theme: shows `themedExamples.default` if defined, else falls back to `examples`.
   * - Any other theme: shows only `themedExamples[theme]` — no cross-theme fallback.
   *   Returns [] if that theme has no files (triggers the "no code" message).
   */
  protected readonly activeFiles = computed((): CodeExample[] => {
    const docEx = this.activeDocExample();
    if (docEx) {
      const theme = this.activeTheme();
      return (docEx.themedFiles[theme] ?? docEx.themedFiles['default'] ?? []) as CodeExample[];
    }
    // Fallback to legacy themedExamples/examples
    const themed = this.themedExamples();
    const theme = this.activeTheme();
    if (theme === 'default') {
      return themed['default']?.length ? themed['default'] : this.examples();
    }
    return themed[theme] ?? [];
  });

  protected readonly activeExample = computed(() => {
    const list = this.activeFiles();
    return list[this.activeIndex()] ?? null;
  });

  /** True only when the active docExample (or themedExamples) defines more than just 'default'. */
  protected readonly hasMultipleThemes = computed((): boolean => {
    const docEx = this.activeDocExample();
    if (docEx) {
      return Object.keys(docEx.themedFiles).filter((k) => k !== 'default').length > 0;
    }
    return Object.keys(this.themedExamples()).filter((k) => k !== 'default').length > 0;
  });

  /**
   * Resolved demo component for the active example. Initially `null` while
   * the per-component chunk loads; the effect below kicks off the async
   * lookup whenever the active exportName changes.
   */
  readonly demoComponent = signal<Type<unknown> | null>(null);

  /** True until the registry has answered for the current exportName. */
  protected readonly resolvingDemo = signal(false);

  protected readonly hasDemo = computed(() => !!this.demoComponent());

  /** Signal-based view query — resolves to the ViewContainerRef when #previewHost exists in the DOM. */
  private readonly previewHost = viewChild<string, ViewContainerRef>('previewHost', {
    read: ViewContainerRef,
  });

  constructor() {
    // React to the active example's exportName: clear the current demo and
    // kick off the async chunk load. We track via the files() signal so the
    // effect re-runs on tab / theme switch.
    effect(() => {
      const files = this.activeFiles();
      const exportName = files[0]?.exportName;
      if (!exportName) {
        untracked(() => this.demoComponent.set(null));
        return;
      }
      untracked(() => this.resolvingDemo.set(true));
      this.registrySvc
        .get(exportName)
        .then((cmp) => {
          // Bail if the active example changed while we awaited the chunk —
          // a newer effect cycle will have written the latest demo.
          const latest = this.activeFiles()[0]?.exportName;
          if (latest !== exportName) return;
          this.demoComponent.set(cmp);
          this.resolvingDemo.set(false);
        })
        .catch(() => {
          this.demoComponent.set(null);
          this.resolvingDemo.set(false);
        });
    });

    // Mount/unmount the resolved component into #previewHost.
    effect(() => {
      const vcr = this.previewHost();
      const comp = this.demoComponent();
      if (!vcr) return;
      vcr.clear();
      if (comp) vcr.createComponent(comp);
    });
  }

  protected setActive(i: number): void {
    this.activeIndex.set(i);
  }

  protected async copyActive(): Promise<void> {
    const ex = this.activeExample();
    if (!ex) return;
    try {
      await navigator.clipboard.writeText(ex.content);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  protected async openInStackBlitz(): Promise<void> {
    const examples = this.activeFiles();
    if (!examples.length) return;

    const { default: sdk } = await import('@stackblitz/sdk');

    // Build files object
    const files: Record<string, string> = {};
    for (const ex of examples) {
      files[ex.filename] = ex.content;
    }

    // Add Angular boilerplate if not present
    if (!files['index.html']) {
      files['index.html'] = `<!doctype html>
<html lang="en">
  <head><title>${this.componentName()} — kouji-ui</title></head>
  <body><app-root></app-root></body>
</html>`;
    }

    if (!files['main.ts']) {
      files['main.ts'] = `import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
bootstrapApplication(AppComponent).catch(console.error);`;
    }

    // Find the main component file
    const mainFile =
      examples.find((e) => e.filename === 'app.component.ts')?.filename ?? examples[0]?.filename;

    sdk.openProject(
      {
        title: `${this.componentName()} — kouji-ui`,
        description: `kouji-ui ${this.componentName()} example`,
        template: 'angular-cli',
        files,
        dependencies: {
          '@kouji-ui/core': 'latest',
          '@angular/cdk': '^21.0.0',
        },
      },
      { openFile: mainFile, newWindow: true },
    );
  }
}
