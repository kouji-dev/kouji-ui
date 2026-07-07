// Only SSR-safe (Lexical-free at runtime) symbols are re-exported here so that
// importing `@kouji-ui/core` never eagerly loads the browser-only engine.
export { KjRichTextEditor } from './rich-text-editor';
export type {
  KjTextFormat,
  KjBlockType,
  KjRichTextState,
  KjRichTextValue,
  KjImageInsert,
} from './rich-text-editor.types';
export type { KjRichTextPlugin, KjRichTextContext } from './rich-text-plugin';
