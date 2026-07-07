import type { KjRichTextContext, KjRichTextFeature } from '@kouji-ui/core';
import { LinkEditor } from '../overlays/link-editor';

/**
 * Link feature. Lazily loads core `lexical` (for selection reads) and
 * `@lexical/link`. Contributes the link node, a Ctrl/Cmd+K shortcut, a toolbar
 * toggle, and the link-editor overlay.
 */
export function link(): KjRichTextFeature {
  let lex!: typeof import('lexical');
  let mod!: typeof import('@lexical/link');

  function selectedUrl(ctx: KjRichTextContext): string {
    return ctx.read(() => {
      const selection = lex.$getSelection();
      if (!lex.$isRangeSelection(selection)) return '';
      for (const node of selection.getNodes()) {
        const link = mod.$isLinkNode(node)
          ? node
          : mod.$isLinkNode(node.getParent())
            ? node.getParent()
            : null;
        if (link && mod.$isLinkNode(link)) return link.getURL();
      }
      return '';
    });
  }

  function open(ctx: KjRichTextContext): void {
    ctx.openOverlay('link', {
      url: selectedUrl(ctx),
      apply: (url: string) => {
        ctx.update(() => mod.$toggleLink(url ? url : null));
        ctx.closeOverlay();
        ctx.focus();
        ctx.announce(url ? 'Link added' : 'Link removed');
      },
      remove: () => {
        ctx.update(() => mod.$toggleLink(null));
        ctx.closeOverlay();
        ctx.focus();
        ctx.announce('Link removed');
      },
      close: () => {
        ctx.closeOverlay();
        ctx.focus();
      },
    });
  }

  return {
    name: 'link',
    async load() {
      [lex, mod] = await Promise.all([import('lexical'), import('@lexical/link')]);
    },
    nodes: () => [mod.LinkNode],
    setup: (ctx) => ctx.registerShortcut('mod+k', () => open(ctx)),
    toolbar: [
      {
        id: 'link',
        group: 'insert',
        order: 0,
        icon: 'link',
        label: 'Link',
        ariaKeyshortcuts: 'Control+K',
        kind: 'toggle',
        isActive: (state) => state.isLink,
        run: (ctx) => open(ctx),
      },
    ],
    overlay: [{ id: 'link', label: 'Edit link', component: LinkEditor }],
  };
}
