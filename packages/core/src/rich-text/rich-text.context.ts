import { InjectionToken, type Provider, type Signal, inject } from '@angular/core';
import type { LexicalEditor } from 'lexical';
import type { KjRichTextFeature, KjRteToolbarItem } from './feature';
import type { KjRichTextState } from './rich-text-editor.types';

/**
 * Context contract exposed by a {@link KjRichTextEditor} through {@link KJ_RICH_TEXT}.
 *
 * Follows the repo's signal-context pattern (root provides a token pointing to
 * itself; descendants inject it) so that child directives and toolbars can read
 * editor state / toolbar contributions and register features without a hard
 * reference to the class.
 */
export interface KjRichTextHost {
  /** The live Lexical editor instance, or `null` before initialization. */
  readonly editor: Signal<LexicalEditor | null>;
  /** Current formatting state derived from the selection. */
  readonly state: Signal<KjRichTextState>;
  /** Toolbar items contributed by the active features, sorted by group then order. */
  readonly toolbarItems: Signal<readonly KjRteToolbarItem[]>;
  /**
   * Register a feature with this editor. Must be called before the editor
   * initializes (during a child directive's `ngOnInit`, or via
   * {@link provideKjRichText}) for node-contributing features to take effect.
   */
  registerFeature(feature: KjRichTextFeature): void;
}

/**
 * Context token for the rich-text editor. A {@link KjRichTextEditor} provides it
 * pointing to itself; descendants (toolbars, feature directives) inject it.
 */
export const KJ_RICH_TEXT = new InjectionToken<KjRichTextHost>('KJ_RICH_TEXT');

/**
 * Multi-provider token for app- or scope-wide rich-text features. Contribute to
 * it with {@link provideKjRichText}; every {@link KjRichTextEditor} in that
 * injector scope activates them.
 */
export const KJ_RICH_TEXT_FEATURES = new InjectionToken<KjRichTextFeature[]>(
  'KJ_RICH_TEXT_FEATURES',
);

/** @deprecated Renamed to {@link KJ_RICH_TEXT_FEATURES}. Same token instance. */
export const KJ_RICH_TEXT_EXTENSIONS = KJ_RICH_TEXT_FEATURES;

/**
 * Register one or more rich-text features for every editor in this injector
 * scope (app config, a route, or a component's `providers`). Only the chosen
 * features load their packages and contribute toolbar/overlay UI.
 *
 * @example
 * ```ts
 * providers: [provideKjRichText(bold(), italic(), link())]
 * ```
 */
export function provideKjRichText(...features: KjRichTextFeature[]): Provider[] {
  return features.map((feature) => ({
    provide: KJ_RICH_TEXT_FEATURES,
    useValue: feature,
    multi: true,
  }));
}

/**
 * Injection token holding the Lexical node instance being decorated. An Angular
 * component mounted for a decorator node injects it (via {@link injectRichTextNode})
 * to read the node's data.
 */
export const KJ_RICH_TEXT_NODE = new InjectionToken<unknown>('KJ_RICH_TEXT_NODE');

/** Inject the Lexical node instance a decorator-node component is rendering. */
export function injectRichTextNode<T = unknown>(): T {
  return inject(KJ_RICH_TEXT_NODE) as T;
}

/** Injection token holding the data a feature passed to `context.openOverlay(id, data)`. */
export const KJ_RTE_OVERLAY_DATA = new InjectionToken<unknown>('KJ_RTE_OVERLAY_DATA');

/** Inject the data supplied to the currently rendered rich-text overlay component. */
export function injectRteOverlayData<T = unknown>(): T {
  return inject(KJ_RTE_OVERLAY_DATA) as T;
}

/** A component mounted by the decorator bridge, with a handle to tear it down. */
export interface KjMountedComponent {
  /** The mounted component's root DOM element (to append into the node's host). */
  readonly element: HTMLElement;
  /** Destroy the component and detach it from change detection. */
  destroy(): void;
}

/**
 * Adapter the engine uses to mount an Angular component for a Lexical decorator
 * node. Supplied by {@link KjRichTextEditor} so the engine stays free of Angular
 * DI specifics (and CDK-free).
 */
export interface KjDecoratorMountAdapter {
  /** Mount `component`, providing `node` via {@link KJ_RICH_TEXT_NODE}. */
  mount(component: unknown, node: unknown): KjMountedComponent;
}
