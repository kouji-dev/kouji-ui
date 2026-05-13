import { Component } from '@angular/core';

/**
 * Default menubar — the canonical File / Edit / View arrangement.
 *
 * TODO(overlay-migration): rewrite using the new dropdown-menu primitives
 * (KjDropdownMenuTrigger / KjDropdownMenuContent) and the menubar wrappers.
 */
@Component({
  selector: 'kj-menubar-example',
  standalone: true,
  imports: [],
  styles: [`:host { display: block; padding: var(--kj-space-2xl); min-height: 18rem; }`],
  template: `<p>Default menubar example pending rewrite onto overlay primitives.</p>`,
})
export class KjMenubarExample {}
