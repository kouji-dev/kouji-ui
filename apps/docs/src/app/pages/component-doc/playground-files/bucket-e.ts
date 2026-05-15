import type { PlaygroundFile } from '../playground-types';
import { PLAYGROUND as SpinnerPlayground } from '@kouji-ui/components/spinner/spinner.playground';
import { PLAYGROUND as StepperPlayground } from '@kouji-ui/components/stepper/stepper.playground';
import { PLAYGROUND as TabsPlayground } from '@kouji-ui/components/tabs/tabs.playground';
import { PLAYGROUND as TagPlayground } from '@kouji-ui/components/tag/tag.playground';
import { PLAYGROUND as TextareaPlayground } from '@kouji-ui/components/textarea/textarea.playground';
import { PLAYGROUND as TimePickerPlayground } from '@kouji-ui/components/time-picker/time-picker.playground';
import { PLAYGROUND as ToastPlayground } from '@kouji-ui/components/toast/toast.playground';
import { PLAYGROUND as TogglePlayground } from '@kouji-ui/components/toggle/toggle.playground';
import { PLAYGROUND as TooltipPlayground } from '@kouji-ui/components/tooltip/tooltip.playground';
import { PLAYGROUND as TreeSelectPlayground } from '@kouji-ui/components/tree-select/tree-select.playground';
import { PLAYGROUND as TypographyPlayground } from '@kouji-ui/components/typography/typography.playground';

/**
 * Bucket E migrations. Keys are `DocItem.symbol` (the directive / component
 * symbol matching what the docs page was generated against). Each value
 * imports the `PLAYGROUND` export from the component's `<comp>.playground.ts`
 * file co-located in `packages/components/src/<comp>/`.
 *
 * Service-launched components (`toast`) use the wrapper symbol
 * `KjToastWrapperComponent`; `typography` uses the docs marker
 * `KjTypographyDocs` since it ships no wrapper component.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BUCKET_E_FILES: Record<string, PlaygroundFile> = {
  KjSpinnerComponent: SpinnerPlayground,
  KjStepperComponent: StepperPlayground,
  KjTabsComponent: TabsPlayground,
  KjTagComponent: TagPlayground,
  KjTextareaComponent: TextareaPlayground,
  KjTimePickerComponent: TimePickerPlayground,
  KjToastWrapperComponent: ToastPlayground,
  KjToggleComponent: TogglePlayground,
  KjTooltipComponent: TooltipPlayground,
  KjTreeSelectComponent: TreeSelectPlayground,
  KjTypographyDocs: TypographyPlayground,
};
