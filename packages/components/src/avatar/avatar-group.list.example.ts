import { Component } from '@angular/core';
import { KjAvatarGroupComponent } from './avatar-group';
import { KjAvatarComponent } from './avatar';

/**
 * Semantic `role="list"` variant: when the group's children are interactive
 * (e.g. links to teammate profiles), set `kjRole="list"` so AT announces a
 * list of items rather than a generic group. Each child anchor carries
 * `role="listitem"` so the listitem semantics survive the wrapping `<a>`.
 */
@Component({
  selector: 'kj-avatar-group-list-example',
  standalone: true,
  imports: [KjAvatarGroupComponent, KjAvatarComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    a { display: inline-flex; text-decoration: none; color: inherit; }
  `],
  template: `
    <kj-avatar-group kjRole="list" kjAriaLabel="teammates">
      <a role="listitem" href="#ada" aria-label="Ada Lovelace">
        <kj-avatar content="AL" alt="Ada Lovelace" />
      </a>
      <a role="listitem" href="#grace" aria-label="Grace Hopper">
        <kj-avatar content="GH" alt="Grace Hopper" />
      </a>
      <a role="listitem" href="#alan" aria-label="Alan Turing">
        <kj-avatar content="AT" alt="Alan Turing" />
      </a>
      <a role="listitem" href="#katherine" aria-label="Katherine Johnson">
        <kj-avatar content="KJ" alt="Katherine Johnson" />
      </a>
    </kj-avatar-group>
  `,
})
export class KjAvatarGroupListExample {}
