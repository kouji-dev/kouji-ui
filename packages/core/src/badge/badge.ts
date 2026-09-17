import { Directive, booleanAttribute, input } from '@angular/core';
import type { KjExtensible } from '../presets/preset-value';
import { KjSize, KjVariant, bindPresets } from '../presets';
import { KJ_BADGE_CONFIG } from './config';

/**
 * Visual variant of a badge. Open by design ({@link KjExtensible}): the four
 * values below ship with CSS in `@kouji-ui/components`, and any other string
 * is reflected verbatim as `data-variant` so a consumer can add their own.
 *
 * This alias documents what ships; the input it annotates is the composed
 * {@link KjVariant}'s `kjVariant`, whose accepted values come from
 * {@link KJ_BADGE_CONFIG}. Register a new one so dev mode stops warning about
 * it, then write its rule:
 *
 * ```ts
 * provideKjBadge({ variants: [...KJ_BADGE_DEFAULTS.variants, 'brand'] })
 * ```
 * ```css
 * .kj-badge[data-variant="brand"] {
 *   --kj-badge-bg: var(--brand-500);
 *   --kj-badge-fg: white;
 * }
 * ```
 * Author that rule **unlayered** — an unlayered declaration beats everything
 * in `@layer kj.component` whatever its specificity.
 *
 * ```html
 * <span kjBadge kjVariant="brand">Beta</span>
 * ```
 *
 * Badge's variants are **not** interchangeable with Tag's — see
 * `KJ_TAG_DEFAULTS`.
 */
export type KjBadgeVariant = KjExtensible<'default' | 'secondary' | 'destructive' | 'outline'>;

/**
 * Marks an element as a badge via data attributes.
 *
 * Apply `[kjBadge]` to any inline element to reflect the `data-variant` and
 * `data-size` attributes that theme CSS reads, without adding any wrapper
 * markup. No styling is attached.
 *
 * Variant and size are the shared preset primitives — `[kjVariant]` and
 * `[kjSize]`, composed via `hostDirectives` and configured through
 * `provideKjBadge(…)`, exactly like `[kjTag]` and `[kjButton]`. Each resolves
 * `explicit input > KJ_VARIANT_FALLBACK / KJ_SIZE_FALLBACK cascade >
 * configured default`, and warns once in dev mode on a value outside the
 * configured list (the value is still reflected, because it may well have CSS).
 *
 * Set `kjBadgeDot` to reflect a `data-dot` attribute for theme CSS to render a
 * leading status indicator.
 *
 * @example `<span kjBadge [kjVariant]="'destructive'">Critical</span>`
 * @doc-category Core/Data display
 * @doc
 * @doc-name badge
 * @doc-description Marks an inline element as a badge with variant and size data attributes that theme CSS picks up.
 * @doc-is-main
 */
@Directive({
  selector: '[kjBadge]',
  standalone: true,
  providers: [...bindPresets(KJ_BADGE_CONFIG)],
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
  ],
  host: {
    '[attr.data-dot]': 'kjBadgeDot() ? "" : null',
  },
})
export class KjBadge {
  /** Reflects `data-dot` so theme CSS can render a leading status dot. Defaults to `false`. */
  kjBadgeDot = input(false, { transform: booleanAttribute });
}
