import { Component } from '@angular/core';

/**
 * Menubar with a disabled top-level item.
 *
 * TODO(overlay-migration): rewrite using the new dropdown-menu primitives
 * (KjDropdownMenuTrigger / KjDropdownMenuContent) and the menubar wrappers.
 */
@Component({
  selector: 'kj-menubar-disabled-item-example',
  standalone: true,
  imports: [],
  styles: [`:host { display: block; padding: var(--kj-space-2xl); min-height: 18rem; }`],
  template: `<p>Menubar disabled-item example pending rewrite onto overlay primitives.</p>`,
})
export class KjMenubarDisabledItemExample {}
