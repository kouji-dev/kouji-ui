import type { PlaygroundFile } from '../playground-types';
import { PLAYGROUND as NumberInputPlayground } from '@kouji-ui/components/number-input/number-input.playground';
import { PLAYGROUND as OverlayBadgePlayground } from '@kouji-ui/components/overlay-badge/overlay-badge.playground';
import { PLAYGROUND as PaginationPlayground } from '@kouji-ui/components/pagination/pagination.playground';
import { PLAYGROUND as PasswordInputPlayground } from '@kouji-ui/components/password-input/password-input.playground';
import { PLAYGROUND as PopoverPlayground } from '@kouji-ui/components/popover/popover.playground';
import { PLAYGROUND as ProgressBarPlayground } from '@kouji-ui/components/progress-bar/progress-bar.playground';
import { PLAYGROUND as RadioPlayground } from '@kouji-ui/components/radio/radio.playground';
import { PLAYGROUND as SelectPlayground } from '@kouji-ui/components/select/select.playground';
import { PLAYGROUND as SkeletonPlayground } from '@kouji-ui/components/skeleton/skeleton.playground';
import { PLAYGROUND as SliderPlayground } from '@kouji-ui/components/slider/slider.playground';
import { PLAYGROUND as SpeedDialPlayground } from '@kouji-ui/components/speed-dial/speed-dial.playground';

/**
 * Bucket D migrations. Keys are `DocItem.symbol` (e.g. `KjButtonComponent`)
 * matching the directive / component the docs page is built around.
 *
 * Each value imports the `PLAYGROUND` export from the component's
 * `<comp>.playground.ts` file co-located in `packages/components/src/<comp>/`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BUCKET_D_FILES: Record<string, PlaygroundFile> = {
  KjNumberInputComponent: NumberInputPlayground,
  KjOverlayBadgeComponent: OverlayBadgePlayground,
  KjPaginationComponent: PaginationPlayground,
  KjPasswordInputComponent: PasswordInputPlayground,
  KjPopoverComponent: PopoverPlayground,
  KjProgressBarComponent: ProgressBarPlayground,
  KjRadioGroupComponent: RadioPlayground,
  KjSelectComponent: SelectPlayground,
  KjSkeletonComponent: SkeletonPlayground,
  KjSliderComponent: SliderPlayground,
  KjSpeedDialComponent: SpeedDialPlayground,
};
