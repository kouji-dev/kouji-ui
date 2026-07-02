import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  KjDropdownMenuTrigger,
  KjDropdownMenuContent,
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
} from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin shortcuts demo.
@Component({
  selector: 'kj-dropdown-menu-shortcuts-example',
  standalone: true,
  imports: [
    KjDropdownMenuTrigger,
    KjDropdownMenuContent,
    KjDropdownMenuItem,
    KjDropdownMenuSeparator,
    KjButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button kjDropdownMenuTrigger #t="kjDropdownMenuTrigger">Open</kj-button>
    <kj-dropdown-menu-content [kjFor]="t">
      <button kjDropdownMenuItem>Save <span>⌘S</span></button>
      <hr kjDropdownMenuSeparator />
      <button kjDropdownMenuItem>Quit <span>⌘Q</span></button>
    </kj-dropdown-menu-content>
  `,
})
export class KjDropdownMenuShortcutsExample {}
