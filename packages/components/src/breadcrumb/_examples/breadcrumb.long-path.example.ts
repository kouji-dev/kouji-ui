import { Component } from '@angular/core';
import {
  KjBreadcrumbComponent,
  KjBreadcrumbListComponent,
  KjBreadcrumbItemComponent,
  KjBreadcrumbLinkComponent,
  KjBreadcrumbCurrentComponent,
} from '../breadcrumb';

/**
 * Long-path example with 6 crumbs. With `kjOverflow="none"` no truncation
 * occurs and the row will wrap (configure via the list's `kjWrap="wrap"`
 * for explicit multi-line layout).
 */
@Component({
  selector: 'kj-breadcrumb-long-path-example',
  standalone: true,
  imports: [
    KjBreadcrumbComponent,
    KjBreadcrumbListComponent,
    KjBreadcrumbItemComponent,
    KjBreadcrumbLinkComponent,
    KjBreadcrumbCurrentComponent,
  ],
  styles: [
    `:host { display: block; }`,
  ],
  template: `
    <kj-breadcrumb kjOverflow="none">
      <kj-breadcrumb-list kjWrap="wrap">
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/">Home</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/projects">Projects</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/projects/aurora">Aurora</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/projects/aurora/v2">v2</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/projects/aurora/v2/research">Research</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-current>Field notes</kj-breadcrumb-current>
        </kj-breadcrumb-item>
      </kj-breadcrumb-list>
    </kj-breadcrumb>
  `,
})
export class KjBreadcrumbLongPathExample {}
