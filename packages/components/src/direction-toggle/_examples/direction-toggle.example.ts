import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { KjLocale } from '@kouji-ui/core';
import { KjDirectionToggle } from '../direction-toggle';
import {
  KjBreadcrumbComponent,
  KjBreadcrumbCurrentComponent,
  KjBreadcrumbItemComponent,
  KjBreadcrumbLinkComponent,
  KjBreadcrumbListComponent,
} from '../../breadcrumb/breadcrumb';
import {
  KjPaginationComponent,
  KjPaginationItemComponent,
  KjPaginationPreviousComponent,
  KjPaginationNextComponent,
  KjPaginationFirstComponent,
  KjPaginationLastComponent,
  KjPaginationEllipsisComponent,
} from '../../pagination/pagination';

/**
 * RTL toggle demo. Click the toggle to flip the shared `KjLocale.direction`;
 * the surrounding container mirrors via `[attr.dir]` and every logical-property
 * layout (breadcrumb trail, pagination row) reverses. With
 * `provideKjDocumentDirection()` registered at the app scope, the same click
 * also flips `<html dir>` for the whole page.
 */
@Component({
  selector: 'kj-example-direction-toggle',
  standalone: true,
  imports: [
    KjDirectionToggle,
    KjBreadcrumbComponent,
    KjBreadcrumbListComponent,
    KjBreadcrumbItemComponent,
    KjBreadcrumbLinkComponent,
    KjBreadcrumbCurrentComponent,
    KjPaginationComponent,
    KjPaginationItemComponent,
    KjPaginationPreviousComponent,
    KjPaginationNextComponent,
    KjPaginationFirstComponent,
    KjPaginationLastComponent,
    KjPaginationEllipsisComponent,
  ],
  styles: [
    `
      :host {
        display: block;
        padding: 2rem;
      }
      .rtl-demo {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .rtl-demo__bar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .rtl-demo__hint {
        font-size: 0.8125rem;
        opacity: 0.7;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="rtl-demo" [attr.dir]="direction()">
      <div class="rtl-demo__bar">
        <kj-direction-toggle />
        <span class="rtl-demo__hint">
          direction: {{ direction() }} — layout mirrors, DOM order stays put
        </span>
      </div>

      <kj-breadcrumb>
        <kj-breadcrumb-list>
          <kj-breadcrumb-item>
            <kj-breadcrumb-link kjHref="/">Home</kj-breadcrumb-link>
          </kj-breadcrumb-item>
          <kj-breadcrumb-item>
            <kj-breadcrumb-link kjHref="/docs">Docs</kj-breadcrumb-link>
          </kj-breadcrumb-item>
          <kj-breadcrumb-item>
            <kj-breadcrumb-current>RTL</kj-breadcrumb-current>
          </kj-breadcrumb-item>
        </kj-breadcrumb-list>
      </kj-breadcrumb>

      <kj-pagination [(kjPage)]="page" [kjTotalPages]="10" #p="kjPagination">
        <kj-pagination-first>«</kj-pagination-first>
        <kj-pagination-previous>‹</kj-pagination-previous>
        @for (token of p.pages(); track token) {
          @if (token === 'ellipsis-left' || token === 'ellipsis-right') {
            <kj-pagination-ellipsis>…</kj-pagination-ellipsis>
          } @else {
            <kj-pagination-item [kjPage]="token">{{ token }}</kj-pagination-item>
          }
        }
        <kj-pagination-next>›</kj-pagination-next>
        <kj-pagination-last>»</kj-pagination-last>
      </kj-pagination>
    </div>
  `,
})
export class DirectionToggleExample {
  private readonly locale = inject(KjLocale);

  /** Resolved direction from the shared locale — drives the container mirror. */
  readonly direction = this.locale.direction;

  readonly page = signal(2);
}
