import type { PlaygroundLoader } from '../playground-types';

/**
 * Bucket E migrations. Keys are `DocItem.symbol` (the directive / component
 * symbol matching what the docs page was generated against). Each value
 * imports the `PLAYGROUND` export from the component's `<comp>.playground.ts`
 * file co-located in `packages/components/src/<comp>/`.
 *
 * Service-launched components (`toast`) use the wrapper symbol
 * `KjToastWrapper`; `typography` uses the docs marker
 * `KjTypographyDocs` since it ships no wrapper component.
 */
export const BUCKET_E_LOADERS: Record<string, PlaygroundLoader> = {
  KjSpinnerComponent: () => import('@kouji-ui/components/spinner/spinner.playground').then((m) => m.PLAYGROUND),
  KjStepperComponent: () => import('@kouji-ui/components/stepper/stepper.playground').then((m) => m.PLAYGROUND),
  KjTabsComponent: () => import('@kouji-ui/components/tabs/tabs.playground').then((m) => m.PLAYGROUND),
  KjTagComponent: () => import('@kouji-ui/components/tag/tag.playground').then((m) => m.PLAYGROUND),
  KjTextareaComponent: () => import('@kouji-ui/components/textarea/textarea.playground').then((m) => m.PLAYGROUND),
  KjTimePickerComponent: () => import('@kouji-ui/components/time-picker/time-picker.playground').then((m) => m.PLAYGROUND),
  KjToastWrapper: () => import('@kouji-ui/components/toast/toast.playground').then((m) => m.PLAYGROUND),
  KjToggleComponent: () => import('@kouji-ui/components/toggle/toggle.playground').then((m) => m.PLAYGROUND),
  KjTooltip: () => import('@kouji-ui/components/tooltip/tooltip.playground').then((m) => m.PLAYGROUND),
  KjTreeSelectComponent: () => import('@kouji-ui/components/tree-select/tree-select.playground').then((m) => m.PLAYGROUND),
  KjTypographyDocs: () => import('@kouji-ui/components/typography/typography.playground').then((m) => m.PLAYGROUND),
};
