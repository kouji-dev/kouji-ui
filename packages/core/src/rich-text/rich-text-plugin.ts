// Back-compat alias layer. The registration primitive was renamed from
// "extension"/"plugin" to "feature" (KjRichTextFeature) — these aliases keep
// the old names compiling.
import type { KjRichTextFeature } from './feature';

export type { KjRichTextContext, KjDecoratorRegistration } from './feature';

/**
 * @deprecated Renamed to {@link KjRichTextFeature}. Kept as an alias for
 * backwards compatibility; will be removed in a future major.
 */
export type KjRichTextExtension = KjRichTextFeature;

/**
 * @deprecated Renamed to {@link KjRichTextFeature}. Kept as an alias for
 * backwards compatibility; will be removed in a future major.
 */
export type KjRichTextPlugin = KjRichTextFeature;
