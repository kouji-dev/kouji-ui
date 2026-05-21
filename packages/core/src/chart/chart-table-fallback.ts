import { Directive, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';

/**
 * Projects a screen-reader-only table fallback for a `KjChart`. When present
 * inside a `[kjChart]` host, the chart's canvas wrapper becomes `aria-hidden`
 * and the table is rendered alongside it (visually-hidden via the host's
 * sr-only styling) so assistive technology reads structured data instead of
 * the canvas.
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
export class KjChartTableFallback implements OnInit {
  readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);

  ngOnInit(): void {
    this.vcr.createEmbeddedView(this.tpl);
  }
}
