// Only SSR-safe (Lexical-free at runtime) symbols are re-exported here so that
// importing `@kouji-ui/core` never eagerly loads the browser-only engine.
// `createKjDecoratorNode` receives the `lexical` namespace as an argument, so it
// carries no eager Lexical import and is safe to export.
export { KjRichTextEditor } from './rich-text-editor';
export { KjRichTextExtensionDirective } from './rich-text-extension';
export {
  KJ_RICH_TEXT,
  KJ_RICH_TEXT_EXTENSIONS,
  KJ_RICH_TEXT_NODE,
  provideKjRichText,
  injectRichTextNode,
  type KjRichTextHost,
  type KjDecoratorMountAdapter,
  type KjMountedComponent,
} from './rich-text.context';
export { createKjDecoratorNode } from './decorator-node';
export type { KjDecoratorNodeConfig, KjDecoratorNodeApi } from './decorator-node';
export type {
  KjTextFormat,
  KjBlockType,
  KjRichTextState,
  KjRichTextValue,
  KjImageInsert,
} from './rich-text-editor.types';
export type {
  KjRichTextExtension,
  KjRichTextPlugin,
  KjRichTextContext,
  KjDecoratorRegistration,
} from './rich-text-plugin';
