import { Component } from '@angular/core';

/**
 * Menubar with a nested submenu.
 *
 * TODO(overlay-migration): rewrite using the new dropdown-menu API
 * (`<button kjDropdownMenuTrigger>` + `<kj-dropdown-menu-content [kjFor]="t">`).
 * The previous template used `[kjDropdownMenuTriggerFor]="tpl"` template-ref
 * passing, which the new API does not yet expose. Submenu pattern needs a
 * separate design pass.
 */
@Component({
  selector: 'kj-menubar-with-submenu-example',
  standalone: true,
  imports: [],
  styles: [
    `:host { display: block; padding: var(--kj-space-2xl); min-height: 22rem; }`,
  ],
  template: `
    <p>Menubar submenu example pending rewrite onto overlay primitives.</p>
  `,
})
export class KjMenubarWithSubmenuExample {}
