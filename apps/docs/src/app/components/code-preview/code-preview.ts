import { Component, Type, ViewContainerRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { CodeEditorComponent } from '../code-editor/code-editor';
import { DynamicComponentService } from '../../services/dynamic-component.service';
import { PreviewTheme, PREVIEW_THEMES } from '../../services/preview-theme';

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

  private readonly dynamicSvc = inject(DynamicComponentService);

  protected readonly activeTheme = signal<PreviewTheme>('default');
  protected readonly previewThemes = PREVIEW_THEMES;

  /** Whether the code editor panel is visible. Hidden by default. */
  protected readonly showCode = signal(false);

  protected readonly activeIndex = signal(0);
  protected readonly copied = signal(false);

  /**
   * Active example files for the current theme.
   *
   * Rules:
   * - DEFAULT theme: shows `themedExamples.default` if defined, else falls back to `examples`
   *   (which holds the plain `@doc-file` entries — they belong to the default theme).
   * - Any other theme: shows only `themedExamples[theme]` — no cross-theme fallback.
   *   Returns [] if that theme has no files (triggers the "no code" message).
   */
  protected readonly activeFiles = computed((): CodeExample[] => {
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

  // demoComponent: try dynamic creation from activeFiles source
  readonly demoComponent = computed((): Type<unknown> | null => {
    const files = this.activeFiles();
    if (!files.length) return null;
    // Use the first file's content to create a dynamic component
    const source = files[0]?.content;
    if (!source) return null;
    return this.dynamicSvc.create(source);
  });

  protected readonly hasDemo = computed(() => {
    const files = this.activeFiles();
    return files.length > 0 && !!this.dynamicSvc.create(files[0]?.content ?? '');
  });

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
