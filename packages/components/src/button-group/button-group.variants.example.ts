import { Component } from '@angular/core';
import { KjButtonGroupComponent } from './button-group';
import { KjButtonComponent } from '../button/button';

/**
 * Group-level variant propagation. The group sets `kjVariant="outline"` —
 * children that don't override read it as a fallback through the
 * `KJ_BUTTON_GROUP` context. Each child still applies the same variant
 * explicitly here so the styled wrapper picks it up; the group context is
 * the integration point for future variant-aware children.
 */
@Component({
  selector: 'kj-button-group-variants-example',
  standalone: true,
  imports: [KjButtonGroupComponent, KjButtonComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
  `],
  template: `
    <kj-button-group kjVariant="outline" kjAriaLabel="Outline group">
      <kj-button kjVariant="outline">Day</kj-button>
      <kj-button kjVariant="outline">Week</kj-button>
      <kj-button kjVariant="outline">Month</kj-button>
    </kj-button-group>

    <kj-button-group kjVariant="ghost" kjAriaLabel="Ghost group">
      <kj-button kjVariant="ghost">Cut</kj-button>
      <kj-button kjVariant="ghost">Copy</kj-button>
      <kj-button kjVariant="ghost">Paste</kj-button>
    </kj-button-group>
  `,
})
export class KjButtonGroupVariantsExample {}
