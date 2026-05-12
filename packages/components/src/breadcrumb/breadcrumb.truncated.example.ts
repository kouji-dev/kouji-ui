import { Component } from '@angular/core';
import {
  KjBreadcrumbComponent,
  KjBreadcrumbListComponent,
  KjBreadcrumbItemComponent,
  KjBreadcrumbLinkComponent,
  KjBreadcrumbCurrentComponent,
  KjBreadcrumbEllipsisComponent,
} from './breadcrumb';

/**
 * Truncation example. With `kjMaxItems=3` and 5 crumbs, the middle 3 collapse
 * into the ellipsis cell (visible: `Home › … › Current`).
 */
@Component({
  selector: 'kj-breadcrumb-truncated-example',
  standalone: true,
  imports: [
    KjBreadcrumbComponent,
    KjBreadcrumbListComponent,
    KjBreadcrumbItemComponent,
    KjBreadcrumbLinkComponent,
    KjBreadcrumbCurrentComponent,
    KjBreadcrumbEllipsisComponent,
  ],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <kj-breadcrumb [kjMaxItems]="3">
      <kj-breadcrumb-list>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/">Home</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/a">Section A</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-ellipsis>…</kj-breadcrumb-ellipsis>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/a/b">Subsection B</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/a/b/c">Folder C</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-current>Current page</kj-breadcrumb-current>
        </kj-breadcrumb-item>
      </kj-breadcrumb-list>
    </kj-breadcrumb>
  `,
})
export class KjBreadcrumbTruncatedExample {}
