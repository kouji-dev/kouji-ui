import type { PlaygroundLoader } from '../playground-types';

/**
 * Bucket B migrations. Keys are `DocItem.symbol` matching the directive /
 * component the docs page is built around.
 */
export const BUCKET_B_LOADERS: Record<string, PlaygroundLoader> = {
  KjCheckboxComponent: () => import('@kouji-ui/components/checkbox/checkbox.playground').then((m) => m.PLAYGROUND),
  KjColorPickerComponent: () => import('@kouji-ui/components/color-picker/color-picker.playground').then((m) => m.PLAYGROUND),
  KjComboboxComponent: () => import('@kouji-ui/components/combobox/combobox.playground').then((m) => m.PLAYGROUND),
  KjCommandPaletteComponent: () => import('@kouji-ui/components/command-palette/command-palette.playground').then((m) => m.PLAYGROUND),
  KjConfirmPopupComponent: () => import('@kouji-ui/components/confirm-popup/confirm-popup.playground').then((m) => m.PLAYGROUND),
  KjDatePickerComponent: () => import('@kouji-ui/components/date-picker/date-picker.playground').then((m) => m.PLAYGROUND),
  KjDialogComponent: () => import('@kouji-ui/components/dialog/dialog.playground').then((m) => m.PLAYGROUND),
  KjDividerComponent: () => import('@kouji-ui/components/divider/divider.playground').then((m) => m.PLAYGROUND),
  KjDrawerComponent: () => import('@kouji-ui/components/drawer/drawer.playground').then((m) => m.PLAYGROUND),
  KjDropdownMenuComponent: () => import('@kouji-ui/components/dropdown-menu/dropdown-menu.playground').then((m) => m.PLAYGROUND),
  KjEmptyState: () => import('@kouji-ui/components/empty-state/empty-state.playground').then((m) => m.PLAYGROUND),
  KjFieldComponent: () => import('@kouji-ui/components/field/field.playground').then((m) => m.PLAYGROUND),
};
