import { Component } from '@angular/core';
import {
  KjAccordionComponent,
  KjAccordionItemComponent,
  KjAccordionContentComponent,
} from './accordion';

/**
 * Opt-in arrow-key navigation: ArrowUp / ArrowDown / Home / End move focus
 * between triggers and the group becomes a single tab stop (roving tabindex).
 * Useful for sidebar-style accordions whose triggers dominate the navigation.
 */
@Component({
  selector: 'kj-accordion-arrow-nav-example',
  standalone: true,
  imports: [KjAccordionComponent, KjAccordionItemComponent, KjAccordionContentComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-accordion arrowNavigation type="multiple">
      <kj-accordion-item value="filters" label="Filters">
        <kj-accordion-content>Status, owner, label.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="views" label="Views">
        <kj-accordion-content>My issues, mentions, recent.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="favourites" label="Favourites">
        <kj-accordion-content>Pinned queries.</kj-accordion-content>
      </kj-accordion-item>
    </kj-accordion>
  `,
})
export class KjAccordionArrowNavExample {}
