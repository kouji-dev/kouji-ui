import { Component } from '@angular/core';
import { KjListComponent, KjListItemComponent } from './list';

/**
 * Sidebar-style nav list. `as="nav"` opts the host into the `navigation`
 * landmark; the wrapper enforces a labelled landmark via `ariaLabel`.
 *
 * Each row projects a plain `<a>` — the focus stop, keyboard contract, and
 * routing all live on the link, never on the row chrome. The active row sets
 * both `active="true"` (paints `data-active` chrome) and
 * `aria-current="page"` (the AT-readable signal) — they are two layers of
 * the same idea, deliberately split because the right `aria-current` token
 * depends on the consumer's domain.
 */
@Component({
  selector: 'kj-list-nav-example',
  standalone: true,
  imports: [KjListComponent, KjListItemComponent],
  styles: [`:host { display: block; }`],
  template: `
    <kj-list as="nav" ariaLabel="Primary" [hoverable]="true">
      <kj-list-item [active]="true">
        <a href="#home" aria-current="page">Home</a>
      </kj-list-item>
      <kj-list-item>
        <a href="#projects">Projects</a>
      </kj-list-item>
      <kj-list-item>
        <a href="#team">Team</a>
      </kj-list-item>
      <kj-list-item>
        <a href="#settings">Settings</a>
      </kj-list-item>
    </kj-list>
  `,
})
export class KjListNavExample {}
