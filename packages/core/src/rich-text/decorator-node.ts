/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Type } from '@angular/core';
import type { Klass, LexicalNode } from 'lexical';

/** Configuration for {@link createKjDecoratorNode}. */
export interface KjDecoratorNodeConfig {
  /** Unique Lexical node type string (must match the `decorators` registration). */
  type: string;
  /** The Angular component rendered for each node instance. */
  component: Type<unknown>;
  /** Render inline (`<span>`) rather than as a block (`<div>`). Default `false`. */
  inline?: boolean;
  /** Optional accessible name applied to the node's host element (WCAG 4.1.2). */
  ariaLabel?: string;
}

/** The node class plus helpers returned by {@link createKjDecoratorNode}. */
export interface KjDecoratorNodeApi<TData extends Record<string, unknown> = Record<string, unknown>> {
  /** The generated Lexical `DecoratorNode` subclass — pass to `nodes` in your extension. */
  readonly Node: Klass<LexicalNode>;
  /** Create a node instance carrying `data`. Use inside `editor.update`. */
  $create(data?: TData): LexicalNode;
  /** Type guard for this node. */
  $is(node: LexicalNode | null | undefined): boolean;
}

/**
 * Build a self-contained Lexical `DecoratorNode` subclass whose instances render
 * an Angular component (mounted by the editor's decorator bridge). This is the
 * reusable "render an Angular component as an editor node" framework — define a
 * custom node from outside the engine in a handful of lines.
 *
 * The node stores an arbitrary JSON-serializable `data` object; the mounted
 * component reads it via {@link injectRichTextNode}. `lexical` is passed in (not
 * imported here) so this stays SSR-safe and out of the base bundle.
 *
 * @example
 * ```ts
 * const badge = createKjDecoratorNode(lexical, { type: 'badge', component: BadgeChip, inline: true });
 * // badge.Node -> register via extension.nodes; badge.$create({ label }) -> insert
 * ```
 */
export function createKjDecoratorNode<TData extends Record<string, unknown> = Record<string, unknown>>(
  lexical: typeof import('lexical'),
  config: KjDecoratorNodeConfig,
): KjDecoratorNodeApi<TData> {
  const { DecoratorNode, $applyNodeReplacement } = lexical;

  class KjBridgedDecoratorNode extends (DecoratorNode as any) {
    __data: TData;

    static getType(): string {
      return config.type;
    }

    static clone(node: KjBridgedDecoratorNode): KjBridgedDecoratorNode {
      return new KjBridgedDecoratorNode(node.__data, (node as any).__key);
    }

    static importJSON(json: any): KjBridgedDecoratorNode {
      return new KjBridgedDecoratorNode((json.data ?? {}) as TData);
    }

    constructor(data: TData = {} as TData, key?: string) {
      super(key);
      this.__data = data;
    }

    exportJSON(): any {
      return { ...super.exportJSON(), type: config.type, version: 1, data: this.__data };
    }

    /** The node's payload; read by the mounted component. */
    getData(): TData {
      return this.__data;
    }

    createDOM(): HTMLElement {
      const el = document.createElement(config.inline ? 'span' : 'div');
      el.setAttribute('data-lexical-decorator', config.type);
      el.className = 'kj-rte-decorator';
      // Decorator content is not directly editable; selection steps over it.
      el.contentEditable = 'false';
      if (config.inline) el.style.display = 'inline-block';
      if (config.ariaLabel) el.setAttribute('aria-label', config.ariaLabel);
      return el;
    }

    updateDOM(): boolean {
      return false;
    }

    isInline(): boolean {
      return !!config.inline;
    }

    /** Returned to the decorator bridge, which maps the node → its component. */
    decorate(): unknown {
      return this;
    }
  }

  return {
    Node: KjBridgedDecoratorNode as unknown as Klass<LexicalNode>,
    $create: (data?: TData) =>
      $applyNodeReplacement(
        new KjBridgedDecoratorNode(data ?? ({} as TData)) as unknown as LexicalNode,
      ) as LexicalNode,
    $is: (node: LexicalNode | null | undefined): boolean => node instanceof KjBridgedDecoratorNode,
  };
}
