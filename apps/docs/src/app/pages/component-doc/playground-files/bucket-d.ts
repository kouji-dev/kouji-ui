import type { PlaygroundLoader } from '../playground-types';

/**
 * Bucket D migrations. Keys are `DocItem.symbol` (e.g. `KjButtonComponent`)
 * matching the directive / component the docs page is built around.
 *
 * Each value imports the `PLAYGROUND` export from the component's
 * `<comp>.playground.ts` file co-located in `packages/components/src/<comp>/`.
 */
export const BUCKET_D_LOADERS: Record<string, PlaygroundLoader> = {
  KjNumberInputComponent: () => import('@kouji-ui/components/number-input/number-input.playground').then((m) => m.PLAYGROUND),
  KjOverlayBadgeComponent: () => import('@kouji-ui/components/overlay-badge/overlay-badge.playground').then((m) => m.PLAYGROUND),
  KjPaginationComponent: () => import('@kouji-ui/components/pagination/pagination.playground').then((m) => m.PLAYGROUND),
  KjPasswordInputComponent: () => import('@kouji-ui/components/password-input/password-input.playground').then((m) => m.PLAYGROUND),
  KjPopover: () => import('@kouji-ui/components/popover/popover.playground').then((m) => m.PLAYGROUND),
  KjProgressBarComponent: () => import('@kouji-ui/components/progress-bar/progress-bar.playground').then((m) => m.PLAYGROUND),
  KjRadioGroupComponent: () => import('@kouji-ui/components/radio/radio.playground').then((m) => m.PLAYGROUND),
  KjSelectComponent: () => import('@kouji-ui/components/select/select.playground').then((m) => m.PLAYGROUND),
  KjSkeletonComponent: () => import('@kouji-ui/components/skeleton/skeleton.playground').then((m) => m.PLAYGROUND),
  KjSliderComponent: () => import('@kouji-ui/components/slider/slider.playground').then((m) => m.PLAYGROUND),
  KjSpeedDialComponent: () => import('@kouji-ui/components/speed-dial/speed-dial.playground').then((m) => m.PLAYGROUND),
};
