// Only SSR-safe (Lexical-free at runtime) symbols are re-exported here so that
// importing `@kouji-ui/core` never eagerly loads Lexical or any feature package.
// The node factories (`createKjDecoratorNode`, `createKjImageNode`) receive the
// `lexical` namespace as an argument, so they carry no eager import.
export {
  KjRichTextEditor,
  type KjActiveOverlay,
  type KjRteToolbarGroup,
} from './rich-text-editor';
export { KjRichTextExtensionDirective } from './rich-text-extension';
export {
  KJ_RICH_TEXT,
  KJ_RICH_TEXT_FEATURES,
  KJ_RICH_TEXT_EXTENSIONS,
  KJ_RICH_TEXT_NODE,
  KJ_RTE_OVERLAY_DATA,
  provideKjRichText,
  injectRichTextNode,
  injectRteOverlayData,
  type KjRichTextHost,
  type KjDecoratorMountAdapter,
  type KjMountedComponent,
} from './rich-text.context';
export { createKjDecoratorNode } from './decorator-node';
export type { KjDecoratorNodeConfig, KjDecoratorNodeApi } from './decorator-node';
export { createKjImageNode } from './image-node';
export type { KjImageNodeApi } from './image-node';
export type {
  KjRichTextFeature,
  KjRichTextContext,
  KjRteToolbarItem,
  KjRteToolbarKind,
  KjRteOverlay,
  KjRteShortcut,
  KjDecoratorRegistration,
} from './feature';
export type {
  KjTextFormat,
  KjBlockType,
  KjRichTextState,
  KjRichTextValue,
  KjImageInsert,
} from './rich-text-editor.types';
// Deprecated aliases (renamed to KjRichTextFeature).
export type { KjRichTextExtension, KjRichTextPlugin } from './rich-text-plugin';
