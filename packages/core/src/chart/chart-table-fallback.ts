import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Projects a screen-reader-only table fallback for a `KjChart`. When present
 * inside a `[kjChart]` host, the host directive renders the template as a table
 * *sibling* of the chart element — outside the `role="img"` subtree — so
 * assistive technology reads structured data instead of the canvas.
 *
 * This directive only exposes its `TemplateRef`; `KjChart` performs the
 * rendering (see its `_fallback` content query). Rendering it standalone,
 * without a `[kjChart]` host, produces no output.
 *
 * @example
 * ```html
 * <div kjChart [kjChartOption]="opt()" kjChartLabel="Sales">
 *   <ng-container *kjChartTableFallback>
 *     <table>...</table>
 *   </ng-container>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjChartTableFallback]',
  standalone: true,
})
export class KjChartTableFallback {
  readonly tpl = inject(TemplateRef<unknown>);
}
