import type { PlaygroundLoader } from '../playground-types';

/**
 * Bucket C migrations. Keys are `DocItem.symbol` matching the directive /
 * component the docs page is built around. Each value imports the
 * `PLAYGROUND` export from the component's co-located
 * `<comp>.playground.ts` file.
 *
 * `provideLucideIcons` is the doc-is-main for `icon` (a function, not a
 * class) — its playground hosts the bare `[kjIcon]` directive on a span.
 */
export const BUCKET_C_LOADERS: Record<string, PlaygroundLoader> = {
  KjFileUploadComponent: () => import('@kouji-ui/components/file-upload/file-upload.playground').then((m) => m.PLAYGROUND),
  KjFormComponent: () => import('@kouji-ui/components/form/form.playground').then((m) => m.PLAYGROUND),
  provideLucideIcons: () => import('@kouji-ui/components/icon/icon.playground').then((m) => m.PLAYGROUND),
  KjInputComponent: () => import('@kouji-ui/components/input/input.playground').then((m) => m.PLAYGROUND),
  KjInputGroupComponent: () => import('@kouji-ui/components/input-group/input-group.playground').then((m) => m.PLAYGROUND),
  KjInputMaskComponent: () => import('@kouji-ui/components/input-mask/input-mask.playground').then((m) => m.PLAYGROUND),
  KjInputOtpComponent: () => import('@kouji-ui/components/input-otp/input-otp.playground').then((m) => m.PLAYGROUND),
  KjKbdComponent: () => import('@kouji-ui/components/kbd/kbd.playground').then((m) => m.PLAYGROUND),
  KjLinkComponent: () => import('@kouji-ui/components/link/link.playground').then((m) => m.PLAYGROUND),
  KjListComponent: () => import('@kouji-ui/components/list/list.playground').then((m) => m.PLAYGROUND),
  KjMenubarComponent: () => import('@kouji-ui/components/menubar/menubar.playground').then((m) => m.PLAYGROUND),
};
