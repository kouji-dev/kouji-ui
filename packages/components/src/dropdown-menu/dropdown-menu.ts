// Re-exports of the new overlay-primitive dropdown-menu API. Absorbs the
// context-menu (use `kjTrigger="contextmenu"`) and inline-menu
// (use `kjMount="inline"`) into a single API surface.
export {
  KjDropdownMenuTrigger,
  KjDropdownMenuContent,
  KjDropdownMenuItem,
  KjDropdownMenuSeparator,
  KjDropdownMenuLabel,
  KjDropdownMenuGroup,
  KJ_DROPDOWN_MENU,
  type KjDropdownMenuContext,
  type KjDropdownMenuTriggerKind,
  type KjDropdownMenuMount,
  type KjDropdownMenuCloseReason,
} from '@kouji-ui/core';
