import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import {
  KjPaginationInfo,
} from '@kouji-ui/core';

/**
 * Renders the localised "Page N of M" status text for a `<kj-pagination>`.
 * Wraps `KjPaginationInfo`; when the consumer projects their own content
 * the directive yields and the projection wins.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name pagination
 */
@Component({
  selector: 'kj-pagination-info',
  standalone: true,
  hostDirectives: [KjPaginationInfo],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-pagination-info' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationInfoComponent {}
