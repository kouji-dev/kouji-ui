import { Component, Type, computed, inject, input, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { CodeEditorComponent } from '../code-editor/code-editor';
import { DemoRegistryService } from '../../demos/demo-registry';

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
  /** Example files to show. First file is shown by default. */
  examples = input<CodeExample[]>([]);

  /** Component name for StackBlitz project title. */
  componentName = input<string>('Example');

  /** Demo slug to show in the Preview tab. */
  slug = input<string>('');

  private readonly registry = inject(DemoRegistryService);

  readonly demoComponent = computed((): Type<unknown> | null =>
    this.slug() ? this.registry.get(this.slug()) : null
  );

  protected readonly activeIndex = signal(0);
  protected readonly copied = signal(false);

  protected readonly activeExample = computed(() => {
    const list = this.examples();
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
    const examples = this.examples();
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
