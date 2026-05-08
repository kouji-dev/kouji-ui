import { Component } from '@angular/core';
import { KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';

// TODO(wrapper-overlay): re-skin disabled demo.
@Component({
  selector: 'kj-dropdown-menu-disabled-example',
  standalone: true,
  imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem, KjButtonComponent],
  template: `
    <kj-button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</kj-button>
    <kj-dropdown-menu-content [kjFor]="t">
      <button kjDropdownMenuItem>Enabled</button>
      <button kjDropdownMenuItem disabled>Disabled</button>
    </kj-dropdown-menu-content>
  `,
})
export class KjDropdownMenuDisabledExample {}
