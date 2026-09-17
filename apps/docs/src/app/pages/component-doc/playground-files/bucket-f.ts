import type { PlaygroundLoader } from '../playground-types';

/**
 * Bucket F. Playgrounds added in the docs-completeness pass so every component
 * page has an interactive Playground. Keys are the page's `@doc-is-main`
 * `DocItem.symbol` (functions like `provideLucideIcons` included).
 */
export const BUCKET_F_LOADERS: Record<string, PlaygroundLoader> = {
  KjDatetimePicker: () => import('@kouji-ui/components/datetime-picker/datetime-picker.playground').then((m) => m.PLAYGROUND),
  KjDateRangePresetsComponent: () => import('@kouji-ui/components/date-range-presets/date-range-presets.playground').then((m) => m.PLAYGROUND),
  KjDirectionToggle: () => import('@kouji-ui/components/direction-toggle/direction-toggle.playground').then((m) => m.PLAYGROUND),
  KjTableComponent: () => import('@kouji-ui/components/table/table.playground').then((m) => m.PLAYGROUND),
  KjTypographyDocs: () => import('@kouji-ui/components/typography/typography.playground').then((m) => m.PLAYGROUND),
  provideLucideIcons: () => import('@kouji-ui/components/icon/icon.playground').then((m) => m.PLAYGROUND),
  KjActionSheetComponent: () => import('@kouji-ui/components/action-sheet/action-sheet.playground').then((m) => m.PLAYGROUND),
  KjSheetComponent: () => import('@kouji-ui/components/sheet/sheet.playground').then((m) => m.PLAYGROUND),
  KjSkipLinkComponent: () => import('@kouji-ui/components/skip-link/skip-link.playground').then((m) => m.PLAYGROUND),
  KjChatThread: () => import('@kouji-ui/components/chat/ai-chat.playground').then((m) => m.PLAYGROUND),
  KjRichTextEditorComponent: () => import('@kouji-ui/components/rich-text/rich-text-editor.playground').then((m) => m.PLAYGROUND),
  KjChart: () => import('./chart.playground').then((m) => m.PLAYGROUND),
};
