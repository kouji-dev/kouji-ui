import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  KjBreadcrumbComponent,
  KjBreadcrumbCurrentComponent,
  KjBreadcrumbItemComponent,
  KjBreadcrumbLinkComponent,
  KjBreadcrumbListComponent,
} from './breadcrumb';

/**
 * Common breadcrumb shape — Home → section → page with a current cell.
 * Use this as the copy-paste starting point for new screens.
 */
@Component({
  selector: 'kj-breadcrumb-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KjBreadcrumbComponent,
    KjBreadcrumbListComponent,
    KjBreadcrumbItemComponent,
    KjBreadcrumbLinkComponent,
    KjBreadcrumbCurrentComponent,
  ],
  styles: [`:host { display: block; }`],
  template: `
    <kj-breadcrumb>
      <kj-breadcrumb-list>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/">Home</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/docs">Docs</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/docs/components">Components</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-current>Breadcrumb</kj-breadcrumb-current>
        </kj-breadcrumb-item>
      </kj-breadcrumb-list>
    </kj-breadcrumb>
  `,
})
export class KjBreadcrumbUsageExample {}
