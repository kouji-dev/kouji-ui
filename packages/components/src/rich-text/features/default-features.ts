import type { KjRichTextFeature } from '@kouji-ui/core';
import { bold, italic, underline, strike, inlineCode } from './text-format';
import { heading } from './heading';
import { bulletList, orderedList } from './list';
import { quote } from './quote';
import { codeBlock } from './code-block';
import { link } from './link';
import { image } from './image';
import { markdownShortcuts } from './markdown';
import { history } from './history';

/**
 * The full default feature bundle, so a zero-config `<kj-rich-text-editor>`
 * still gives a complete editor. Compose your own subset with the individual
 * factories to load only the packages you need.
 */
export function defaultFeatures(): KjRichTextFeature[] {
  return [
    bold(),
    italic(),
    underline(),
    strike(),
    inlineCode(),
    heading(),
    bulletList(),
    orderedList(),
    quote(),
    codeBlock(),
    link(),
    image(),
    markdownShortcuts(),
    history(),
  ];
}
