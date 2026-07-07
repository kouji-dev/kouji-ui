import { createKjImageNode, type KjImageNodeApi, type KjRichTextFeature } from '@kouji-ui/core';
import { ImageEditor } from '../overlays/image-editor';

/**
 * Image feature. Lazily loads core `lexical` and builds a self-rendering image
 * node via `createKjImageNode`. Contributes a toolbar button + the image-editor
 * overlay (which collects URL + alt text).
 */
export function image(): KjRichTextFeature {
  let api!: KjImageNodeApi;
  return {
    name: 'image',
    async load() {
      const lex = await import('lexical');
      api = createKjImageNode(lex);
    },
    nodes: () => [api.Node],
    toolbar: [
      {
        id: 'image',
        group: 'insert',
        order: 10,
        icon: 'image',
        label: 'Image',
        kind: 'button',
        run: (ctx) =>
          ctx.openOverlay('image', {
            insert: (src: string, alt: string) => {
              ctx.insertNodes(() => [api.$create({ src, alt })]);
              ctx.closeOverlay();
              ctx.focus();
              ctx.announce('Image inserted');
            },
            close: () => {
              ctx.closeOverlay();
              ctx.focus();
            },
          }),
      },
    ],
    overlay: [{ id: 'image', label: 'Insert image', component: ImageEditor }],
  };
}
