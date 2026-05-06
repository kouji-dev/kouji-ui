import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocsCalloutComponent } from '../../components/callout/callout';
import { CodeEditorComponent } from '../../components/code-editor/code-editor';
import { PageTocDirective } from '../../components/page-toc/page-toc.directive';
import { PageTocComponent } from '../../components/page-toc/page-toc';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [RouterLink, DocsCalloutComponent, CodeEditorComponent, PageTocDirective, PageTocComponent],
  templateUrl: './getting-started.html',
  styleUrl: './getting-started.css',
})
export class GettingStartedComponent {
  readonly installCore = `pnpm add @kouji-ui/core`;

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
