/**
 * Opens a closed literal union to consumer-registered values while keeping
 * editor autocomplete for the values kouji-ui ships.
 *
 * `'a' | 'b' | string` collapses to `string` and loses autocomplete;
 * `'a' | 'b' | (string & {})` does not, because `string & {}` is not
 * assignable *from* the literals during union reduction. That is the whole
 * trick — `KjExtensible<'a' | 'b'>` suggests `'a'` and `'b'` and still accepts
 * `'brand'`.
 *
 * Use it for every **stylistic** preset (variant, size, animation, tone): a
 * consumer registers new values with the matching `provideKj*` config and a
 * CSS rule keyed on the reflected `data-*` attribute, and the type must not
 * be what stops them. Do **not** use it for *behavioural* enums
 * (`orientation`, `activationMode`, `overflow`, `type`) — those are closed on
 * purpose, because the directive branches on the value and an unknown one has
 * no meaning.
 *
 * @example
 * ```ts
 * export type KjBadgeVariant = KjExtensible<'default' | 'secondary'>;
 * // <kj-badge variant="brand"> type-checks; 'default' | 'secondary' autocomplete.
 * ```
 */
// `string & {}` is the whole point: it is deliberately a no-op intersection
// that survives union reduction, which is what preserves the literals'
// autocomplete. Not a mistake, and not replaceable by `string`.
export type KjExtensible<T extends string> = T | (string & {});
