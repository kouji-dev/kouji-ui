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
 * @param owner The container running the query — pass `this`.
 * @param query The raw `contentChildren(KjListItem, { descendants: true })` signal.
 *
 * @doc-category Core/Primitives
 */
export function ownListItems(
  // Typed as `object` rather than `KjListNavigatorConfig`: every caller
  // passes `this` from the field initializer that defines its own `items`,
  // and the stricter type would make that a circular type reference.
  owner: object,
  query: Signal<readonly KjListItem<unknown>[]>,
): Signal<readonly KjListItem<unknown>[]> {
  return computed(() => query().filter(i => i.container === null || i.container === owner));
}
