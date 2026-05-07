export { KjContextMenuTrigger } from './context-menu-trigger';
export type { KjContextMenuAnchorModeInput } from './context-menu-trigger';
export { KjContextMenuRegistry } from './context-menu.registry';
export {
  KJ_CONTEXT_MENU,
  type KjContextMenuAlign,
  type KjContextMenuAnchorMode,
  type KjContextMenuContext,
  type KjContextMenuOpenEvent,
  type KjContextMenuOpenSource,
  type KjContextMenuSide,
} from './context-menu.context';

// Re-export the menu-panel directives so consumers can reach them via
// `@kouji-ui/core` without needing to import from `dropdown-menu`.
export {
  KjDropdownMenu as KjContextMenuPanel,
  KjDropdownMenuGroup as KjContextMenuGroup,
  KjDropdownMenuItem as KjContextMenuItem,
  KjDropdownMenuLabel as KjContextMenuLabel,
  KjDropdownMenuSeparator as KjContextMenuSeparator,
} from '../dropdown-menu/index';
