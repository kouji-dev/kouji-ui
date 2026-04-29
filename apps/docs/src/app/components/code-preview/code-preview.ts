import { Component, Type, ViewContainerRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { CodeEditorComponent } from '../code-editor/code-editor';
import { DemoRegistryService } from '../../demos/demo-registry';
import { PreviewTheme, PREVIEW_THEMES } from '../../demos/preview-theme';

export interface CodeExample {
  lang: 'ts' | 'html' | 'css';
  filename: string;
  content: string;
}

@Component({
  selector: 'kj-code-preview',
  standalone: true,
  imports: [CodeEditorComponent, NgComponentOutlet],
  templateUrl: './code-preview.html',
  styleUrl: './code-preview.css',
})
export class CodePreviewComponent {
  /** Default example files (used as fallback when no themed examples exist). */
  examples = input<CodeExample[]>([]);

  /** Per-theme example files — keyed by theme name. Overrides `examples` when available. */
  themedExamples = input<Record<string, CodeExample[]>>({});

  /** Component name for StackBlitz project title. */
  componentName = input<string>('Example');

  /** Demo slug to show in the Preview tab. */
  slug = input<string>('');

  private readonly registry = inject(DemoRegistryService);

  protected readonly activeTheme = signal<PreviewTheme>('default');
  protected readonly previewThemes = PREVIEW_THEMES;

  readonly demoComponent = computed((): Type<unknown> | null =>
    this.slug() ? this.registry.get(this.slug(), this.activeTheme()) : null
  );

  protected readonly hasDemo = computed(() => this.slug() ? this.registry.hasDemo(this.slug()) : false);

  // Per-theme computed signals
  protected readonly demoDefault  = computed(() => this.registry.get(this.slug(), 'default'));
  protected readonly demoRetro    = computed(() => this.registry.get(this.slug(), 'retro'));
  protected readonly demoFinance  = computed(() => this.registry.get(this.slug(), 'finance'));

  /** Signal-based view query — resolves to the ViewContainerRef when #previewHost exists in the DOM. */
  private readonly previewHost = viewChild<string, ViewContainerRef>('previewHost', { read: ViewContainerRef });

  constructor() {
    // Runs whenever demoComponent() OR previewHost() changes (including when it first becomes available).
    // viewChild() returns undefined until the @if(hasDemo()) block renders the ng-container.
    effect(() => {
      const vcr = this.previewHost();
      const comp = this.demoComponent();
      if (!vcr) return;
      vcr.clear();
      if (comp) vcr.createComponent(comp);
    });
  }

  /** Whether the code editor panel is visible. Hidden by default. */
  protected readonly showCode = signal(false);

  protected readonly activeIndex = signal(0);
  protected readonly copied = signal(false);

  /**
   * Active example files for the current theme.
   * - Multi-theme mode (themedExamples has keys): only shows files for the exact active theme.
   *   Returns [] if no files defined for that theme (code section hides).
   * - Single-theme mode (no themedExamples): falls back to exampleFiles.
   */
  protected readonly activeFiles = computed((): CodeExample[] => {
    const themed = this.themedExamples();
    const theme = this.activeTheme();
    const hasAnyThemed = Object.keys(themed).length > 0;
    if (hasAnyThemed) return themed[theme] ?? [];
    return this.examples();
  });

  protected readonly activeExample = computed(() => {
    const list = this.activeFiles();
    return list[this.activeIndex()] ?? null;
  });

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
    const mainFile = examples.find(e => e.filename === 'app.component.ts')?.filename
      ?? examples[0]?.filename;

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
