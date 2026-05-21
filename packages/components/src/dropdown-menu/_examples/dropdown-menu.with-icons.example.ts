import { Component } from '@angular/core';
import { KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem, KjDropdownMenuSeparator } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin with-icons demo.
@Component({
  selector: 'kj-dropdown-menu-with-icons-example',
  standalone: true,
  imports: [KjDropdownMenuTrigger, KjDropdownMenuContent, KjDropdownMenuItem, KjDropdownMenuSeparator, KjButtonComponent],
  template: `
    <kj-button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</kj-button>
    <kj-dropdown-menu-content [kjFor]="t">
      <button kjDropdownMenuItem><span>📁</span> Open</button>
      <hr kjDropdownMenuSeparator />
      <button kjDropdownMenuItem><span>🚪</span> Quit</button>
    </kj-dropdown-menu-content>
  `,
})
export class KjDropdownMenuWithIconsExample {}
