import { computed, isSignal, Signal, untracked } from '@angular/core';

/**
 * Recursively narrowed signal view of a record. The root behaves like any
 * `Signal<T>` (callable, returns the whole value), and each plain-record
 * property is exposed as a child signal — recursively, so deeply-nested
 * record fields stay reactive without manually wiring `computed()` calls.
 *
 * Implementation is a near-direct port of @ngrx/signals' `toDeepSignal`
 * (see {@link https://github.com/ngrx/platform/blob/a469cbf015628f30fe1fd2a995d6289cdfc26285/modules/signals/src/deep-signal.ts}).
 * We inline it here to avoid the @ngrx/signals dependency for a single
 * helper. Credit: NgRx contributors, MIT.
 */
export type DeepSignal<T> = Signal<T> &
  (IsKnownRecord<T> extends true
    ? Readonly<{
        [K in keyof T]: IsKnownRecord<T[K]> extends true
          ? DeepSignal<T[K]>
          : Signal<T[K]>;
      }>
    : unknown);

type IsKnownRecord<T> = T extends object
  ? T extends
      | readonly unknown[]
      | Set<unknown>
      | Map<unknown, unknown>
      | WeakSet<object>
      | WeakMap<object, unknown>
      | Date
      | RegExp
      | Promise<unknown>
      | Error
      | ((...args: never) => unknown)
    ? false
    : true
  : false;

const DEEP_SIGNAL = Symbol('kj.deep-signal');

/**
 * Wraps a `Signal<T>` so that `result.foo` returns a child `Signal<T['foo']>`
 * (lazily memoised), recursively for nested plain records. The root proxy is
 * still callable — `result()` returns the full `T`.
 *
 * @example
 * ```ts
 * const root = signal({ a: 1, b: { c: 'x' } });
 * const deep = toDeepSignal(root.asReadonly());
 * deep();          // { a: 1, b: { c: 'x' } }
 * deep.a();        // 1
 * deep.b.c();      // 'x'
 * ```
 */
export function toDeepSignal<T>(source: Signal<T>): DeepSignal<T> {
  return new Proxy(source as Signal<T> & Record<PropertyKey, unknown>, {
    has(target, prop): boolean {
      return !!(this.get!(target, prop, undefined) as unknown);
    },
    get(target, prop) {
      const value = untracked(target as Signal<T>);
      if (!isRecord(value) || !(prop in value)) {
        const existing = target[prop];
        if (isSignal(existing) && (existing as { [DEEP_SIGNAL]?: true })[DEEP_SIGNAL]) {
          delete target[prop];
        }
        return target[prop];
      }
      if (!isSignal(target[prop])) {
        const child = computed(() => (target as Signal<Record<PropertyKey, unknown>>)()[prop]);
        (child as { [DEEP_SIGNAL]?: true })[DEEP_SIGNAL] = true;
        Object.defineProperty(target, prop, {
          value: child,
          configurable: true,
        });
      }
      return toDeepSignal(target[prop] as Signal<unknown>);
    },
  }) as DeepSignal<T>;
}

const nonRecords: ReadonlyArray<Function> = [
  WeakSet,
  WeakMap,
  Promise,
  Date,
  Error,
  RegExp,
  ArrayBuffer,
  DataView,
  Function,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || isIterable(value)) {
    return false;
  }
  let proto = Object.getPrototypeOf(value);
  if (proto === Object.prototype) return true;
  while (proto && proto !== Object.prototype) {
    if (nonRecords.includes(proto.constructor)) return false;
    proto = Object.getPrototypeOf(proto);
  }
  return proto === Object.prototype;
}

function isIterable(value: unknown): value is Iterable<unknown> {
  return typeof (value as { [Symbol.iterator]?: unknown })?.[Symbol.iterator] === 'function';
}
