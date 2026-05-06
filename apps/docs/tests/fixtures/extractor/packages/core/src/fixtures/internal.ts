import { Directive, InjectionToken, input } from '@angular/core';

/**
 * Internal directive used to verify the `@internal` filter on classes.
 * @internal
 */
@Directive({ selector: '[internalDirective]', standalone: true })
export class InternalDirective {}

/**
 * Public directive used to verify `@internal` filtering at input level.
 *
 * Has one public input and one internal input — the manifest should include
 * the directive but only list the public input.
 */
@Directive({ selector: '[publicDirective]', standalone: true })
export class PublicDirective {
  /** A public input. */
  publicInput = input<string>('');

  /** @internal */
  internalInput = input<string>('');
}

/** @internal */
export const INTERNAL_TOKEN = new InjectionToken<string>('internal.token');

/** Public injection token. */
export const PUBLIC_TOKEN = new InjectionToken<string>('public.token');
