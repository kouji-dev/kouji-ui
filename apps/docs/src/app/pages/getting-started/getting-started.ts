import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocsCalloutComponent } from '../../components/callout/callout';
import { KjEditorComponent } from '@kouji-ui/components';
import { PageTocDirective } from '../../components/page-toc/page-toc.directive';
import { PageTocComponent } from '../../components/page-toc/page-toc';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [
    RouterLink,
    DocsCalloutComponent,
    KjEditorComponent,
    PageTocDirective,
    PageTocComponent,
  ],
  templateUrl: './getting-started.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './getting-started.css',
})
export class GettingStartedComponent {
  readonly installFull = `pnpm add @kouji-ui/core @kouji-ui/components @kouji-ui/themes`;
  readonly installHeadless = `pnpm add @kouji-ui/core`;

  readonly globalStyles = `// angular.json -> projects.<app>.architect.build.options
"styles": [
  "node_modules/@kouji-ui/themes/src/index.css",
  "node_modules/@kouji-ui/core/styles.css",
  "node_modules/@kouji-ui/components/src/overlay/overlay.css",
  "src/styles.css"
]`;

  readonly viteStyles = `/* src/styles.css — Vite / Analog: package specifiers, resolved through each package's exports map */
@import "@kouji-ui/themes";
@import "@kouji-ui/core/styles.css";
@import "@kouji-ui/components/src/overlay/overlay.css";`;

  readonly viteMain = `// src/main.ts — import the global stylesheet once, from the app entry.
// Vite's SSR pipeline collects .css specifiers instead of executing them, so
// the same line is safe in a server bundle.
import './styles.css';`;

  readonly analogConfig = `// vite.config.ts — nothing kouji-specific is required.
// Both libraries publish pure-ESM FESM2022 with "sideEffects": false, no
// CommonJS interop and no top-level browser globals, so Vite can externalize
// them for SSR: you do not need ssr.noExternal.
import { defineConfig } from 'vite';
import analog from '@analogjs/platform';

export default defineConfig({
  plugins: [analog()],
});`;

  readonly optionalPeers = `# Optional peers are genuinely optional: every heavy integration sits behind a
# dynamic import() or an "import type", so a bare import of '@kouji-ui/core'
# never fails on a missing one. Install only what you actually render.
pnpm add echarts                                # <kj-chart> / [kjChart]
pnpm add monaco-editor @monaco-editor/loader    # <kj-editor>
pnpm add lexical @lexical/rich-text @lexical/list @lexical/link @lexical/history @lexical/markdown @lexical/code @lexical/html @lexical/selection   # <kj-rich-text-editor>
pnpm add @tanstack/virtual-core                 # windowed <kj-table>
pnpm add lucide-static                          # provideLucideIcons() with no explicit subset`;

  readonly coreStylesAlaCarte = `/* @kouji-ui/core/styles.css is the sum of these — register them one by one instead if you prefer */
@import "@kouji-ui/core/overlay/overlay.css";     /* overlay container, wrapper and backdrop chrome */
@import "@kouji-ui/core/icon/icon.css";           /* [kjIcon] mask + font rendering */
@import "@kouji-ui/core/typography/prose.css";    /* .kj-prose long-form typography */
@import "@kouji-ui/core/motion/motion.css";       /* kjMotion enter / exit presets */`;

  readonly quickStartTs = `import { Component } from '@angular/core';
import { KjButton } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjButton],
  template: \`
    <button kjButton [kjVariant]="'destructive'" [kjDisabled]="isLoading()">
      Delete
    </button>
  \`,
})
export class MyComponent {}`;

  readonly headlessStyles = `/* Style via data attributes — works with any CSS approach */
[kjButton] {
  padding: 0.5rem 1rem;
  background: var(--color-primary);
}

[kjButton][data-variant="destructive"] {
  background: var(--color-danger);
}

[kjButton][aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
}`;

  readonly formsTs = `import { Component } from '@angular/core';
import { KjInput } from '@kouji-ui/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  standalone: true,
  imports: [KjInput, ReactiveFormsModule],
  template: \`
    <input kjInput [formControl]="email" type="email" />
    @if (email.invalid && email.touched) {
      <span>Invalid email</span>
    }
  \`,
})
export class MyForm {
  email = new FormControl('');
}`;

  readonly a11yImports = `import {
  KjFocusTrap,
  KjLiveRegion,
  KjRovingTabindex,
  KjVisuallyHidden,
} from '@kouji-ui/core';`;
}
