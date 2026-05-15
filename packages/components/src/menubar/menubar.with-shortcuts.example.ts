import { Component } from '@angular/core';

/**
 * Menubar with keyboard-shortcut hints.
 *
 * TODO(overlay-migration): rewrite using the new dropdown-menu primitives
 * (KjDropdownMenuTrigger / KjDropdownMenuContent), menubar wrappers, and kj-kbd.
 */
@Component({
  selector: 'kj-menubar-with-shortcuts-example',
  standalone: true,
  imports: [],
  styles: [`:host { display: block; padding: var(--kj-space-2xl); min-height: 18rem; }`],
  template: `<p>Menubar with-shortcuts example pending rewrite onto overlay primitives.</p>`,
})
export class KjMenubarWithShortcutsExample {}
