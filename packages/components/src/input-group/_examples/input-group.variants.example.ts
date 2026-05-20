import { Component } from '@angular/core';
import { KjInputComponent } from '../../input/input';
import { KjInputGroupComponent, KjInputGroupAddonComponent } from '../input-group';

/**
 * Demonstrates default, filled, and ghost variant groups side-by-side.
 */
@Component({
  selector: 'kj-input-group-variants-example',
  standalone: true,
  imports: [KjInputGroupComponent, KjInputGroupAddonComponent, KjInputComponent],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--kj-space-md); }
  `],
  template: `
    <kj-input-group>
      <kj-input-group-addon [kjAriaHidden]="true">$</kj-input-group-addon>
      <kj-input type="text" placeholder="Default" aria-label="Default variant amount" />
    </kj-input-group>

    <kj-input-group kjVariant="filled">
      <kj-input-group-addon [kjAriaHidden]="true">$</kj-input-group-addon>
      <kj-input type="text" placeholder="Filled" aria-label="Filled variant amount" />
    </kj-input-group>

    <kj-input-group kjVariant="ghost">
      <kj-input-group-addon [kjAriaHidden]="true">$</kj-input-group-addon>
      <kj-input type="text" placeholder="Ghost" aria-label="Ghost variant amount" />
    </kj-input-group>
  `,
})
export class KjInputGroupVariantsExample {}
