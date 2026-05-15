import type { PlaygroundFile } from '../playground-types';
import { PLAYGROUND as FileUploadPlayground } from '@kouji-ui/components/file-upload/file-upload.playground';
import { PLAYGROUND as FormPlayground } from '@kouji-ui/components/form/form.playground';
import { PLAYGROUND as IconPlayground } from '@kouji-ui/components/icon/icon.playground';
import { PLAYGROUND as InputPlayground } from '@kouji-ui/components/input/input.playground';
import { PLAYGROUND as InputGroupPlayground } from '@kouji-ui/components/input-group/input-group.playground';
import { PLAYGROUND as InputMaskPlayground } from '@kouji-ui/components/input-mask/input-mask.playground';
import { PLAYGROUND as InputOtpPlayground } from '@kouji-ui/components/input-otp/input-otp.playground';
import { PLAYGROUND as KbdPlayground } from '@kouji-ui/components/kbd/kbd.playground';
import { PLAYGROUND as LinkPlayground } from '@kouji-ui/components/link/link.playground';
import { PLAYGROUND as ListPlayground } from '@kouji-ui/components/list/list.playground';
import { PLAYGROUND as MenubarPlayground } from '@kouji-ui/components/menubar/menubar.playground';

/**
 * Bucket C migrations. Keys are `DocItem.symbol` matching the directive /
 * component the docs page is built around. Each value imports the
 * `PLAYGROUND` export from the component's co-located
 * `<comp>.playground.ts` file.
 *
 * `provideLucideIcons` is the doc-is-main for `icon` (a function, not a
 * class) — its playground hosts the bare `[kjIcon]` directive on a span.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BUCKET_C_FILES: Record<string, PlaygroundFile> = {
  KjFileUploadComponent: FileUploadPlayground,
  KjFormComponent: FormPlayground,
  provideLucideIcons: IconPlayground,
  KjInputComponent: InputPlayground,
  KjInputGroupComponent: InputGroupPlayground,
  KjInputMaskComponent: InputMaskPlayground,
  KjInputOtpComponent: InputOtpPlayground,
  KjKbdComponent: KbdPlayground,
  KjLinkComponent: LinkPlayground,
  KjListComponent: ListPlayground,
  KjMenubarComponent: MenubarPlayground,
};
