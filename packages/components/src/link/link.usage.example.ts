import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjLinkComponent } from './link';

/**
 * Common link shapes — inline prose, external, disabled, and a few sizes.
 * Copy-paste starting point for navigation surfaces.
 */
@Component({
  selector: 'kj-link-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjLinkComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); max-width: 60ch; }
    p { line-height: 1.6; margin: 0; }
    .row { display: flex; gap: var(--kj-space-md); align-items: baseline; flex-wrap: wrap; }
  `],
  template: `
    <p>
      Inline:
      <kj-link kjHref="/docs" kjUnderline="always">read the documentation</kj-link>
      or <kj-link kjHref="/playground" kjUnderline="always">try the playground</kj-link>.
    </p>

    <div class="row">
      <kj-link kjHref="https://github.com/kouji-dev/kouji-ui" kjTarget="_blank">GitHub</kj-link>
      <kj-link kjHref="/billing" [kjDisabled]="true">Manage billing</kj-link>
    </div>

    <div class="row">
      <kj-link kjHref="/a" kjSize="sm">Small</kj-link>
      <kj-link kjHref="/b" kjSize="md">Medium</kj-link>
      <kj-link kjHref="/c" kjSize="lg">Large</kj-link>
    </div>
  `,
})
export class KjLinkUsageExample {}
