export { KjEditor } from './editor';
export { KjEditorLoader } from './editor.loader';
export { provideMonaco } from './editor.providers';
export { KJ_MONACO_CONFIG, type KjMonacoConfig } from './editor.tokens';
export {
  KJ_MONACO_LANGUAGE_LOADERS,
  provideMonacoLanguages,
  normalizeLanguage,
} from './editor.languages';
export type {
  KjMonaco,
  KjMonacoLoaderFn,
  KjMonacoLanguageLoader,
  KjEditorLanguage,
  KjEditorOptions,
  KjEditorInstance,
  KjEditorLineNumbers,
  KjEditorWordWrap,
} from './editor.types';
