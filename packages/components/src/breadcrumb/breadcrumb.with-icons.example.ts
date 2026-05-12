import { Component } from '@angular/core';
import {
  KjBreadcrumbComponent,
  KjBreadcrumbListComponent,
  KjBreadcrumbItemComponent,
  KjBreadcrumbLinkComponent,
  KjBreadcrumbCurrentComponent,
} from './breadcrumb';

/**
 * Breadcrumb with a Home icon on the first crumb. The icon sits inside the
 * link cell; the auto separator still renders between items.
 */
@Component({
  selector: 'kj-breadcrumb-with-icons-example',
  standalone: true,
  imports: [
    KjBreadcrumbComponent,
    KjBreadcrumbListComponent,
    KjBreadcrumbItemComponent,
    KjBreadcrumbLinkComponent,
    KjBreadcrumbCurrentComponent,
  ],
  styles: [
    `
      :host {
        display: block;
      }
      .kj-icon {
        width: 1em;
        height: 1em;
        vertical-align: -0.125em;
        margin-inline-end: 0.25em;
      }
    `,
  ],
  template: `
    <kj-breadcrumb>
      <kj-breadcrumb-list>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/" kjAriaLabel="Home">
            <svg
              class="kj-icon"
              viewBox="0 0 16 16"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M2 7l6-5 6 5v7a1 1 0 0 1-1 1h-3v-5H6v5H3a1 1 0 0 1-1-1V7z" />
            </svg>
            Home
          </kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/library">Library</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-current>Data</kj-breadcrumb-current>
        </kj-breadcrumb-item>
      </kj-breadcrumb-list>
    </kj-breadcrumb>
  `,
})
export class KjBreadcrumbWithIconsExample {}
