/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Klass, LexicalNode } from 'lexical';
import type { KjImageInsert } from './rich-text-editor.types';

/** The image node class plus helpers returned by {@link createKjImageNode}. */
export interface KjImageNodeApi {
  /** The generated Lexical image node class — pass to a feature's `nodes()`. */
  readonly Node: Klass<LexicalNode>;
  /** Create an image node. Use inside `editor.update`. */
  $create(image: KjImageInsert): LexicalNode;
  /** Type guard for this image node. */
  $is(node: LexicalNode | null | undefined): boolean;
}

/**
 * Build a self-rendering block image `DecoratorNode` subclass. It paints its own
 * `<figure><img></figure>` in `createDOM` (no framework decorator infra needed)
 * and round-trips through HTML via `importDOM`/`exportDOM`.
 *
 * `lexical` is passed in (not imported here) so this module carries no eager
 * Lexical import and stays SSR-safe — the image feature calls it inside `load()`.
 */
export function createKjImageNode(lexical: typeof import('lexical')): KjImageNodeApi {
  const { DecoratorNode, $applyNodeReplacement } = lexical;

  class KjImageNode extends (DecoratorNode as any) {
    __src: string;
    __alt: string;
    __width?: number;
    __height?: number;

    static getType(): string {
      return 'kj-image';
    }

    static clone(node: KjImageNode): KjImageNode {
      return new KjImageNode(
        { src: node.__src, alt: node.__alt, width: node.__width, height: node.__height },
        (node as any).__key,
      );
    }

    static importJSON(json: any): KjImageNode {
      return new KjImageNode({
        src: json.src,
        alt: json.alt,
        width: json.width,
        height: json.height,
      });
    }

    constructor(props: KjImageInsert, key?: string) {
      super(key);
      this.__src = props.src;
      this.__alt = props.alt ?? '';
      this.__width = props.width;
      this.__height = props.height;
    }

    exportJSON(): any {
      return {
        ...super.exportJSON(),
        type: 'kj-image',
        version: 1,
        src: this.__src,
        alt: this.__alt,
        width: this.__width,
        height: this.__height,
      };
    }

    createDOM(): HTMLElement {
      const figure = document.createElement('figure');
      figure.className = 'kj-rte-image';
      figure.contentEditable = 'false';
      const img = document.createElement('img');
      img.src = this.__src;
      img.alt = this.__alt;
      img.setAttribute('data-lexical-image', 'true');
      if (this.__width) img.width = this.__width;
      if (this.__height) img.height = this.__height;
      figure.appendChild(img);
      return figure;
    }

    updateDOM(prev: KjImageNode): boolean {
      return (
        prev.__src !== this.__src ||
        prev.__alt !== this.__alt ||
        prev.__width !== this.__width ||
        prev.__height !== this.__height
      );
    }

    decorate(): null {
      return null;
    }

    exportDOM(): { element: HTMLElement } {
      const element = document.createElement('img');
      element.setAttribute('data-lexical-image', 'true');
      element.src = this.__src;
      element.alt = this.__alt;
      if (this.__width) element.width = this.__width;
      if (this.__height) element.height = this.__height;
      return { element };
    }

    static importDOM(): any {
      return {
        img: () => ({
          conversion: (domNode: HTMLElement): any => {
            const img = domNode as HTMLImageElement;
            const src = img.getAttribute('src');
            if (!src) return null;
            return {
              node: $create({
                src,
                alt: img.alt || '',
                width: img.width || undefined,
                height: img.height || undefined,
              }),
            };
          },
          priority: 0,
        }),
      };
    }

    isInline(): false {
      return false;
    }

    getSrc(): string {
      return this.__src;
    }

    getAlt(): string {
      return this.__alt;
    }
  }

  const $create = (image: KjImageInsert): LexicalNode =>
    $applyNodeReplacement(new KjImageNode(image) as unknown as LexicalNode) as LexicalNode;

  return {
    Node: KjImageNode as unknown as Klass<LexicalNode>,
    $create,
    $is: (node: LexicalNode | null | undefined): boolean => node instanceof KjImageNode,
  };
}
