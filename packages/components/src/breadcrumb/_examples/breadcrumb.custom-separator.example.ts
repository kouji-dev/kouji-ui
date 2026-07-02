import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  KjBreadcrumbComponent,
  KjBreadcrumbListComponent,
  KjBreadcrumbItemComponent,
  KjBreadcrumbLinkComponent,
  KjBreadcrumbCurrentComponent,
} from '../breadcrumb';

/**
 * Custom separator example. The chevron `›` is supplied via the `kjSeparator`
 * input on the root, which reflects to the
 * `--kj-breadcrumb-separator-content` CSS variable consumed by the auto
 * pseudo-element.
 */
@Component({
  selector: 'kj-breadcrumb-custom-separator-example',
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-breadcrumb kjSeparator="›">
      <kj-breadcrumb-list>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/">Home</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/library">Library</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-link kjHref="/library/data">Data</kj-breadcrumb-link>
        </kj-breadcrumb-item>
        <kj-breadcrumb-item>
          <kj-breadcrumb-current>Sales report Q4</kj-breadcrumb-current>
        </kj-breadcrumb-item>
      </kj-breadcrumb-list>
    </kj-breadcrumb>
  `,
})
export class KjBreadcrumbCustomSeparatorExample {}
