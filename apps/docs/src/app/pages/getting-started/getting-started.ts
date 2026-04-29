import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeEditorComponent } from '../../components/code-editor/code-editor';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';
import { PageTocDirective } from '../../components/page-toc/page-toc.directive';
import { PageTocComponent } from '../../components/page-toc/page-toc';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [RouterLink, CodeEditorComponent, DocsSidebarComponent, PageTocDirective, PageTocComponent],
  templateUrl: './getting-started.html',
  styleUrl: './getting-started.css',
})
export class GettingStartedComponent {
  readonly installCore = `pnpm add @kouji-ui/core`;
  readonly installUi = `pnpm add @kouji-ui/ui`;

  readonly quickStartTs = `import { Component } from '@angular/core';
import { KjButtonDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjButtonDirective],
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

  readonly tailwindImport = `/* In your global styles.css */
@import "@kouji-ui/ui/styles/kj.css";`;

  readonly tailwindUsage = `import { KjButton } from '@kouji-ui/ui';

// KjButton is a pre-styled Angular component wrapping KjButtonDirective`;

  readonly formsTs = `import { Component } from '@angular/core';
import { KjInputDirective } from '@kouji-ui/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  standalone: true,
  imports: [KjInputDirective, ReactiveFormsModule],
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
  KjFocusTrapDirective,
  KjLiveRegionDirective,
  KjRovingTabindexDirective,
  KjVisuallyHiddenDirective,
} from '@kouji-ui/core';`;
}
