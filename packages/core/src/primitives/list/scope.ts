import { computed, type Signal } from '@angular/core';
import type { KjListItem } from './item';

/**
 * Narrows a container's `contentChildren(KjListItem, { descendants: true })`
 * query to the items that actually belong to that container.
 *
 * Every list-style root (`KjSelect`, `KjCommandPalette`, `KjCombobox`,
 * `KjDropdownMenu(Content)`, `KjMenubar`, `KjTreeSelect`,
 * `KjCascadeSelect`) collects its rows with a `descendants: true` content
 * query. That query is blind to composition: it walks straight through a
 * nested list composite and hoovers up *its* rows too. A `<kj-select>`
 * placed inside a `<kj-command-palette>` therefore handed its options to
 * the palette, which then navigated onto them, filtered them with its own
 * query, renumbered their `aria-posinset` / `aria-setsize`, and — on
 * Enter — activated one of them as if it were a command row.
 *
 * `KjListItem` already resolves its one true owner through the element
 * injector ({@link KjListItem.container}: the nearest
 * `KJ_LIST_NAVIGATOR_CONFIG`, which a nested composite provides at its own
 * root). Filtering on that pointer gives every container exactly the items
 * inside its own list scope and nothing from a composite nested within it,
 * for any nesting — select in palette, select in dialog, menu in palette,
 * combobox in select.
 *
 * Items that resolve no container at all (`container === null` — rendered
 * outside any root) are kept, so a bare `[kjListItem]` used with a
 * hand-rolled container still registers.
 *
 * ## Rows a styled wrapper stamps itself
 *
 * A content query reaches only what is projected INTO the container's host
 * element and never crosses into a component's view. A styled wrapper that
 * renders its own rows — `<kj-combobox [options]>`, `<kj-tree-select
 * [kjNodes]>` — therefore contributes nothing to the query, and the rows it
 * paints would be filtered by nothing, numbered by nothing and navigable by
 * nothing. Such a wrapper hands its rows over through `viewRows`, and they
 * are listed FIRST: a wrapper stamps its own rows before the projected slot,
 * so that is DOM order.
 *
 * @param owner The container running the query — pass `this`.
 * @param query The raw `contentChildren(KjListItem, { descendants: true })` signal.
 * @param viewRows Optional rows the container's own wrapper rendered.
 *
 * @doc-category Core/Primitives
 */
export function ownListItems(
  // Typed as `object` rather than `KjListNavigatorConfig`: every caller
  // passes `this` from the field initializer that defines its own `items`,
  // and the stricter type would make that a circular type reference.
  owner: object,
  query: Signal<readonly KjListItem<unknown>[]>,
  viewRows?: Signal<readonly KjListItem<unknown>[] | null>,
): Signal<readonly KjListItem<unknown>[]> {
  const owned = (i: KjListItem<unknown>): boolean =>
    i.container === null || i.container === owner;
  return computed(() => {
    const content = query().filter(owned);
    const view = viewRows?.() ?? null;
    if (!view || view.length === 0) return content;
    const own = view.filter(owned);
    if (content.length === 0) return own;
    return [...own, ...content.filter(c => !own.includes(c))];
  });
}
