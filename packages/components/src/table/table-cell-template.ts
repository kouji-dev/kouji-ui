import { Directive, TemplateRef, inject, input } from '@angular/core';

/**
 * Registers a custom cell template for one column of a `<kj-table>`.
 *
 * Declare inside the table's content with the column id, and use the template
 * context to render arbitrary markup (badges, buttons, avatars…) instead of
 * the default `getValue()` text:
 *
 * ```html
 * <kj-table [kjData]="rows()" [kjColumns]="cols">
 *   <ng-template kjCellTemplate="role" let-row let-value="value">
 *     <kj-badge [bg]="roleBg(row.role)">{{ value }}</kj-badge>
 *   </ng-template>
 * </kj-table>
 * ```
 *
 * Context: `$implicit` / `row` — the row data; `value` — `cell.getValue()`;
 * `cell` — the TanStack cell instance.
 *
 * Editing, grouping, and aggregation cells keep their built-in rendering;
 * the template applies to plain data cells only.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name table
 */
@Directive({ selector: 'ng-template[kjCellTemplate]', standalone: true })
export class KjCellTemplateDirective {
  /** Column id this template renders. */
  readonly kjCellTemplate = input.required<string>();
  /** @internal */
  readonly template = inject(TemplateRef);
}

/** Template context passed to `kjCellTemplate` templates. */
export interface KjCellTemplateContext<TData> {
  $implicit: TData;
  row: TData;
  value: unknown;
  cell: unknown;
}
