/**
 * Recursively-optional view of a configuration object. Arrays and functions
 * are treated as leaves (they are *replaced*, never merged element-wise), so
 * `KjDeepPartial<KjButtonConfig>` accepts `{ defaults: { size: 'lg' } }` while
 * still rejecting `{ defaults: { size: 42 } }`.
 *
 * This is the argument type of every `provideKj*` function. Plain
 * `Partial<T>` only makes the *top* level optional, which forced a caller who
 * wanted one new default to restate all of them (and to re-copy them from the
 * source on every library minor).
 */
export type KjDeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      T[K] extends (...args: any[]) => unknown
      ? T[K]
      : T[K] extends object
        ? KjDeepPartial<T[K]>
        : T[K];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Merges a partial configuration over a complete defaults object, recursing
 * into plain sub-objects (`defaults: { … }`) and **replacing** every other
 * value — arrays (`variants`, `sizes`, `animations`) and label functions are
 * swapped wholesale, which is the behaviour every `provideKj*` docstring
 * describes.
 *
 * `undefined` on the override is treated as "not provided", so
 * `{ defaults: { size: undefined } }` keeps the shipped default rather than
 * blanking it.
 *
 * Every `provideKj*` in the library routes through this one helper, so merge
 * depth is the same wherever you configure a component.
 *
 * @example
 * ```ts
 * provideKjButton({ defaults: { size: 'lg' } });
 * // → { variants: [...shipped], sizes: [...shipped],
 * //     defaults: { variant: 'default', size: 'lg' } }
 * ```
 */
export function mergeKjConfig<T extends object>(defaults: T, config: KjDeepPartial<T> | undefined): T {
  if (!config) return defaults;
  const result = { ...defaults } as Record<string, unknown>;
  for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
    if (value === undefined) continue;
    const base = result[key];
    result[key] =
      isPlainObject(base) && isPlainObject(value)
        ? mergeKjConfig(base, value as KjDeepPartial<Record<string, unknown>>)
        : value;
  }
  return result as T;
}
