// Re-exports of the new service-launched drawer API.
// Drawer absorbs the bottom-sheet via `kjSide="bottom"` + `kjDrag` options on
// `KjDrawerService.open()`.
export {
  KjDrawer,
  KjDrawerService,
  KjDrawerRef,
  type KjDrawerOpenOptions,
  type KjDrawerSide,
} from '@kouji-ui/core';
