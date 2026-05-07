import { Component, signal } from '@angular/core';
import { KjButtonGroupComponent } from './button-group';
import { KjButtonComponent } from '../button/button';

/**
 * Toggle-style group using `KjButton`'s built-in `kjPressed` model on each
 * child. The group itself is purely presentational here — it provides the
 * segmented visual and the `role="group"` host. Per-child `[(kjPressed)]`
 * gives `aria-pressed` semantics without coupling the group to selection
 * state.
 */
@Component({
  selector: 'kj-button-group-toggle-example',
  standalone: true,
  imports: [KjButtonGroupComponent, KjButtonComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button-group kjAriaLabel="Text formatting">
      <kj-button kjVariant="outline" [(kjPressed)]="bold">Bold</kj-button>
      <kj-button kjVariant="outline" [(kjPressed)]="italic">Italic</kj-button>
      <kj-button kjVariant="outline" [(kjPressed)]="underline">Underline</kj-button>
    </kj-button-group>
  `,
})
export class KjButtonGroupToggleExample {
  readonly bold = signal<boolean | undefined>(true);
  readonly italic = signal<boolean | undefined>(false);
  readonly underline = signal<boolean | undefined>(false);
}
