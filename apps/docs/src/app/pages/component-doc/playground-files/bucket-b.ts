import type { PlaygroundFile } from '../playground-types';
import { PLAYGROUND as CheckboxPlayground } from '@kouji-ui/components/checkbox/checkbox.playground';
import { PLAYGROUND as ColorPickerPlayground } from '@kouji-ui/components/color-picker/color-picker.playground';
import { PLAYGROUND as ComboboxPlayground } from '@kouji-ui/components/combobox/combobox.playground';
import { PLAYGROUND as CommandPalettePlayground } from '@kouji-ui/components/command-palette/command-palette.playground';
import { PLAYGROUND as ConfirmPopupPlayground } from '@kouji-ui/components/confirm-popup/confirm-popup.playground';
import { PLAYGROUND as DatePickerPlayground } from '@kouji-ui/components/date-picker/date-picker.playground';
import { PLAYGROUND as DialogPlayground } from '@kouji-ui/components/dialog/dialog.playground';
import { PLAYGROUND as DividerPlayground } from '@kouji-ui/components/divider/divider.playground';
import { PLAYGROUND as DrawerPlayground } from '@kouji-ui/components/drawer/drawer.playground';
import { PLAYGROUND as DropdownMenuPlayground } from '@kouji-ui/components/dropdown-menu/dropdown-menu.playground';
import { PLAYGROUND as EmptyStatePlayground } from '@kouji-ui/components/empty-state/empty-state.playground';
import { PLAYGROUND as FieldPlayground } from '@kouji-ui/components/field/field.playground';

/**
 * Bucket B migrations. Keys are `DocItem.symbol` matching the directive /
 * component the docs page is built around.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BUCKET_B_FILES: Record<string, PlaygroundFile> = {
  KjCheckboxComponent: CheckboxPlayground,
  KjColorPickerComponent: ColorPickerPlayground,
  KjComboboxComponent: ComboboxPlayground,
  KjCommandPaletteComponent: CommandPalettePlayground,
  KjConfirmPopupComponent: ConfirmPopupPlayground,
  KjDatePickerComponent: DatePickerPlayground,
  KjDialogComponent: DialogPlayground,
  KjDividerComponent: DividerPlayground,
  KjDrawerComponent: DrawerPlayground,
  KjDropdownMenuComponent: DropdownMenuPlayground,
  KjEmptyStateComponent: EmptyStatePlayground,
  KjFieldComponent: FieldPlayground,
};
