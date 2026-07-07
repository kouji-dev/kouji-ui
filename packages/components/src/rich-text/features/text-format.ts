import type { KjRichTextFeature, KjRteShortcut, KjTextFormat } from '@kouji-ui/core';

/**
 * Build an inline-format toggle feature. These need no package loading — inline
 * formatting uses the core `FORMAT_TEXT_COMMAND` — so the whole feature is a
 * toolbar toggle plus an optional keyboard shortcut.
 */
function inlineFormat(
  format: KjTextFormat,
  icon: string,
  label: string,
  order: number,
  shortcut?: KjRteShortcut,
  ariaKeyshortcuts?: string,
): KjRichTextFeature {
  return {
    name: format,
    setup: shortcut
      ? (ctx) => ctx.registerShortcut(shortcut, () => ctx.toggleInlineFormat(format))
      : undefined,
    toolbar: [
      {
        id: format,
        group: 'format',
        order,
        icon,
        label,
        ariaKeyshortcuts,
        kind: 'toggle',
        isActive: (state) => state.activeFormats.has(format),
        run: (ctx) => ctx.toggleInlineFormat(format),
      },
    ],
  };
}

/** Bold (Ctrl/Cmd+B). */
export function bold(): KjRichTextFeature {
  return inlineFormat('bold', 'bold', 'Bold', 10, 'mod+b', 'Control+B');
}

/** Italic (Ctrl/Cmd+I). */
export function italic(): KjRichTextFeature {
  return inlineFormat('italic', 'italic', 'Italic', 20, 'mod+i', 'Control+I');
}

/** Underline (Ctrl/Cmd+U). */
export function underline(): KjRichTextFeature {
  return inlineFormat('underline', 'underline', 'Underline', 30, 'mod+u', 'Control+U');
}

/** Strikethrough. */
export function strike(): KjRichTextFeature {
  return inlineFormat('strikethrough', 'strikethrough', 'Strikethrough', 40);
}

/** Inline code. */
export function inlineCode(): KjRichTextFeature {
  return inlineFormat('code', 'code', 'Inline code', 50);
}
