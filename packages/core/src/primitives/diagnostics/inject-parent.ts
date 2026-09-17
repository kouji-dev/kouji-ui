import { inject, type ProviderToken } from '@angular/core';
import { kjError } from './dev-mode';

/** What {@link injectParent} needs in order to name both ends of a broken composition. */
export interface KjParentRequirement {
  /** The child that needs the parent — its class name, e.g. `'KjTab'`. */
  readonly child: string;
  /** The parent's selector, exactly as an author would type it, e.g. `'[kjTabs]'`. */
  readonly parent: string;
}

/**
 * Inject a required parent context token and fail with a message that names
 * the composition the author got wrong.
 *
 * A child directive that injects its parent's token directly fails with
 * Angular's generic `NG0201: No provider for InjectionToken KjTabs`, which
 * names neither the child that needs it nor the selector to add. This raises
 * `[KjTab] must be used inside \`[kjTabs]\`…` instead, from the library, in
 * every build.
 *
 * @typeParam T - The context interface the token carries.
 * @param token - The parent's context token.
 * @param requirement - The child's class name and the parent's selector.
 * @returns The parent context.
 * @throws Error when no ancestor provides `token`.
 *
 * @example
 * ```ts
 * private readonly tabs = injectParent(KJ_TABS, { child: 'KjTab', parent: '[kjTabs]' });
 * ```
 *
 * @doc-category Core/Primitives
 */
export function injectParent<T>(
  token: ProviderToken<T>,
  requirement: KjParentRequirement,
): T {
  const found = inject(token, { optional: true });
  if (found != null) return found;
  throw kjError(
    requirement.child,
    `must be used inside \`${requirement.parent}\`. Add the parent directive to an ancestor element, or import it into the component that renders this one.`,
  );
}
