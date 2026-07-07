import { InjectionToken, type Provider, type Signal, inject } from '@angular/core';
import type { LexicalEditor } from 'lexical';
import type { KjRichTextExtension } from './rich-text-plugin';
import type { KjRichTextState } from './rich-text-editor.types';

/**
 * Context contract exposed by a {@link KjRichTextEditor} through {@link KJ_RICH_TEXT}.
 *
 * Follows the repo's signal-context pattern (root provides a token pointing to
 * itself; descendants inject it) so that child directives and toolbars can read
 * editor state and contribute extensions without a hard reference to the class.
 */
export interface KjRichTextHost {
  /** The live Lexical editor instance, or `null` before initialization. */
  readonly editor: Signal<LexicalEditor | null>;
  /** Current formatting state derived from the selection. */
  readonly state: Signal<KjRichTextState>;
  /**
   * Register an extension with this editor. Must be called before the editor
   * initializes (i.e. during construction / `ngOnInit` of a child directive, or
   * via {@link provideKjRichText}) for node-contributing extensions to take effect.
   */
  registerExtension(extension: KjRichTextExtension): void;
}

/**
 * Context token for the rich-text editor. A {@link KjRichTextEditor} provides it
 * pointing to itself; descendants (toolbars, extension directives) inject it.
 */
export const KJ_RICH_TEXT = new InjectionToken<KjRichTextHost>('KJ_RICH_TEXT');

/**
 * Multi-provider token for app- or scope-wide rich-text extensions. Contribute
 * to it with {@link provideKjRichText}; every {@link KjRichTextEditor} in that
 * injector scope registers them automatically.
 */
export const KJ_RICH_TEXT_EXTENSIONS = new InjectionToken<KjRichTextExtension[]>(
  'KJ_RICH_TEXT_EXTENSIONS',
);

/**
 * Register one or more rich-text extensions for every editor in this injector
 * scope (app config, a route, or a component's `providers`).
 *
 * @example
 * ```ts
 * providers: [provideKjRichText(mentionExtension, badgeExtension)]
 * ```
 */
export function provideKjRichText(...extensions: KjRichTextExtension[]): Provider[] {
  return extensions.map((extension) => ({
    provide: KJ_RICH_TEXT_EXTENSIONS,
    useValue: extension,
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
