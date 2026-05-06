import { Directive, InjectionToken, InputSignal, input } from '@angular/core';

/**
 * Internal directive used to verify the `@internal` filter on classes.
 * Its `kjVariantLike` input is composed by `ConsumerDirective` via
 * `hostDirectives` — the manifest should resolve the input's type from
 * here even though this class is filtered from the public manifest.
 * @internal
 */
@Directive({ selector: '[internalDirective]', standalone: true })
export class InternalDirective {
  /** Mimics the `KjVariant.kjVariant` shape with an explicit field annotation. */
  readonly kjVariantLike: InputSignal<string> = input('default');
}

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

/**
 * Public consumer that composes `InternalDirective` and forwards `kjVariantLike`.
 * The manifest should list this input on `ConsumerDirective` with the type
 * resolved from `InternalDirective` (`string`), not the placeholder.
 */
@Directive({
  selector: '[consumerDirective]',
  standalone: true,
  hostDirectives: [
    { directive: InternalDirective, inputs: ['kjVariantLike'] },
  ],
})
export class ConsumerDirective {}

/** @internal */
export const INTERNAL_TOKEN = new InjectionToken<string>('internal.token');

/** Public injection token. */
export const PUBLIC_TOKEN = new InjectionToken<string>('public.token');
