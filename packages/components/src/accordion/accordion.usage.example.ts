import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjAccordionComponent,
  KjAccordionItemComponent,
  KjAccordionContentComponent,
} from './accordion';

/**
 * Common accordion shape — labelled items, controlled value, arrow-key roving.
 * Use this as the copy-paste starting point for new screens.
 */
@Component({
  selector: 'kj-accordion-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjAccordionComponent,
    KjAccordionItemComponent,
    KjAccordionContentComponent,
  ],
  styles: [`:host { display: block; }`],
  template: `
    <kj-accordion [value]="open()" (valueChange)="open.set($any($event))" arrowNavigation>
      <kj-accordion-item value="install" label="Installation">
        <kj-accordion-content>Run pnpm add @kouji-ui/components and import the providers.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="theme" label="Theming">
        <kj-accordion-content>Wire a preset (default, retro, neon) through provideKjTheme.</kj-accordion-content>
      </kj-accordion-item>
      <kj-accordion-item value="a11y" label="Accessibility">
        <kj-accordion-content>Every directive is keyboard-first and ships WCAG 2.1 AAA contracts.</kj-accordion-content>
      </kj-accordion-item>
    </kj-accordion>
  `,
})
export class KjAccordionUsageExample {
  readonly open = signal<string>('install');
}
