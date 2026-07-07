import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import type { KjImageInsert } from './rich-text-editor.types';

/** Serialized form of a {@link KjImageNode}. */
export type SerializedKjImageNode = Spread<
  {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  },
  SerializedLexicalNode
>;

/**
 * A block image node that renders its own `<figure><img></figure>` markup.
 *
 * Unlike framework-mounted decorator nodes, this node paints itself in
 * `createDOM`, so it needs no Angular renderer, no decorator listener, and
 * works identically under jsdom and SSR prerendering. `decorate()` returns
 * `null` because there is no extra framework-rendered content.
 */
export class KjImageNode extends DecoratorNode<null> {
  private __src: string;
  private __alt: string;
  private __width?: number;
  private __height?: number;

  static override getType(): string {
    return 'kj-image';
  }

  static override clone(node: KjImageNode): KjImageNode {
    return new KjImageNode(
      { src: node.__src, alt: node.__alt, width: node.__width, height: node.__height },
      node.__key,
    );
  }

  static override importJSON(serialized: SerializedKjImageNode): KjImageNode {
    return $createKjImageNode({
      src: serialized.src,
      alt: serialized.alt,
      width: serialized.width,
      height: serialized.height,
    });
  }

  constructor(props: KjImageInsert, key?: NodeKey) {
    super(key);
    this.__src = props.src;
    this.__alt = props.alt ?? '';
    this.__width = props.width;
    this.__height = props.height;
  }

  override exportJSON(): SerializedKjImageNode {
    return {
      ...super.exportJSON(),
      type: KjImageNode.getType(),
      version: 1,
      src: this.__src,
      alt: this.__alt,
      width: this.__width,
      height: this.__height,
    };
  }

  override createDOM(_config: EditorConfig): HTMLElement {
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

  override updateDOM(prev: KjImageNode): boolean {
    return (
      prev.__src !== this.__src ||
      prev.__alt !== this.__alt ||
      prev.__width !== this.__width ||
      prev.__height !== this.__height
    );
  }

  override decorate(): null {
    return null;
  }

  override exportDOM(): DOMExportOutput {
    const element = document.createElement('img');
    element.setAttribute('data-lexical-image', 'true');
    element.src = this.__src;
    element.alt = this.__alt;
    if (this.__width) element.width = this.__width;
    if (this.__height) element.height = this.__height;
    return { element };
  }

  static override importDOM(): DOMConversionMap | null {
    return {
      img: () => ({ conversion: $convertImageElement, priority: 0 }),
    };
  }

  override isInline(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAlt(): string {
    return this.__alt;
  }
}

function $convertImageElement(domNode: HTMLElement): DOMConversionOutput | null {
  const img = domNode as HTMLImageElement;
  const src = img.getAttribute('src');
  if (!src) return null;
  const width = img.width || undefined;
  const height = img.height || undefined;
  return { node: $createKjImageNode({ src, alt: img.alt || '', width, height }) };
}

/** Create a {@link KjImageNode}. */
export function $createKjImageNode(props: KjImageInsert): KjImageNode {
  return $applyNodeReplacement(new KjImageNode(props));
}

/** Type guard for {@link KjImageNode}. */
export function $isKjImageNode(node: LexicalNode | null | undefined): node is KjImageNode {
  return node instanceof KjImageNode;
}
