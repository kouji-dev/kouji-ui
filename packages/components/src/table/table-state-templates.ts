import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Registers the empty-state template for a `<kj-table>` — rendered when the
 * table resolves to zero rows and is neither loading nor errored.
 *
 * Prefer this over the `[kjEmpty]` content slot: the template is instantiated
 * only while the state is active, so avatars, buttons and injected services in
 * the empty state cost nothing on a populated table.
 *
 * ```html
 * <kj-table [kjData]="rows()" [kjColumns]="cols">
 *   <ng-template kjEmptyTemplate>
 *     <p>No users found.</p>
 *     <kj-button kjSize="sm" (click)="add()">Add user</kj-button>
 *   </ng-template>
 * </kj-table>
 * ```
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name table
 */
@Directive({ selector: 'ng-template[kjEmptyTemplate]', standalone: true })
export class KjTableEmptyTemplate {
  /** @internal */
  readonly template = inject(TemplateRef);
}

/**
 * Registers the loading template for a `<kj-table>` — rendered while the
 * resource is in flight or `[kjLoading]` is set, replacing the built-in
 * "Loading…" text with a project-specific spinner or skeleton.
 *
 * On a *reload* (rows already on screen) the table shows its slim progress
 * stripe instead and this template stays hidden, so the stale rows remain
 * readable.
 *
 * ```html
 * <kj-table [kjResource]="res" [kjColumns]="cols">
 *   <ng-template kjLoadingTemplate>
 *     <my-spinner />
 *   </ng-template>
 * </kj-table>
 * ```
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name table
 */
@Directive({ selector: 'ng-template[kjLoadingTemplate]', standalone: true })
export class KjTableLoadingTemplate {
  /** @internal */
  readonly template = inject(TemplateRef);
}

/**
 * Registers the error template for a `<kj-table>` — rendered when the bound
 * `[kjResource]` rejects. Pair it with `reload()` for a retry affordance.
 *
 * ```html
 * <kj-table [kjResource]="res" [kjColumns]="cols">
 *   <ng-template kjErrorTemplate>
 *     <p>Failed to load.</p>
 *     <kj-button kjSize="sm" (click)="res.reload()">Try again</kj-button>
 *   </ng-template>
 * </kj-table>
 * ```
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name table
 */
@Directive({ selector: 'ng-template[kjErrorTemplate]', standalone: true })
export class KjTableErrorTemplate {
  /** @internal */
  readonly template = inject(TemplateRef);
}
