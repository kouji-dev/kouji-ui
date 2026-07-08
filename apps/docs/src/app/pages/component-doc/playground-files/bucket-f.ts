import type { PlaygroundFile } from '../playground-types';
import { PLAYGROUND as DatetimePickerPlayground } from '@kouji-ui/components/datetime-picker/datetime-picker.playground';
import { PLAYGROUND as DateRangePresetsPlayground } from '@kouji-ui/components/date-range-presets/date-range-presets.playground';
import { PLAYGROUND as DirectionTogglePlayground } from '@kouji-ui/components/direction-toggle/direction-toggle.playground';
import { PLAYGROUND as TablePlayground } from '@kouji-ui/components/table/table.playground';
import { PLAYGROUND as TypographyPlayground } from '@kouji-ui/components/typography/typography.playground';
import { PLAYGROUND as IconPlayground } from '@kouji-ui/components/icon/icon.playground';
import { PLAYGROUND as ActionSheetPlayground } from '@kouji-ui/components/action-sheet/action-sheet.playground';
import { PLAYGROUND as SheetPlayground } from '@kouji-ui/components/sheet/sheet.playground';
import { PLAYGROUND as SkipLinkPlayground } from '@kouji-ui/components/skip-link/skip-link.playground';
import { PLAYGROUND as AiChatPlayground } from '@kouji-ui/components/chat/ai-chat.playground';
import { PLAYGROUND as RichTextEditorPlayground } from '@kouji-ui/components/rich-text/rich-text-editor.playground';

/**
 * Bucket F. Playgrounds added in the docs-completeness pass so every component
 * page has an interactive Playground. Keys are the page's `@doc-is-main`
 * `DocItem.symbol` (functions like `provideLucideIcons` included).
 */
export const BUCKET_F_FILES: Record<string, PlaygroundFile> = {
  KjDatetimePickerComponent: DatetimePickerPlayground,
  KjDateRangePresetsComponent: DateRangePresetsPlayground,
  KjDirectionToggle: DirectionTogglePlayground,
  KjTableComponent: TablePlayground,
  KjTypographyDocs: TypographyPlayground,
  provideLucideIcons: IconPlayground,
  KjActionSheetComponent: ActionSheetPlayground,
  KjSheetComponent: SheetPlayground,
  KjSkipLinkComponent: SkipLinkPlayground,
  KjChatThread: AiChatPlayground,
  KjRichTextEditorComponent: RichTextEditorPlayground,
};
