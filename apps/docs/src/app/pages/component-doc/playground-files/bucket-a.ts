import type { PlaygroundFile } from '../playground-types';
import { PLAYGROUND as AccordionPlayground } from '@kouji-ui/components/accordion/accordion.playground';
import { PLAYGROUND as AlertPlayground } from '@kouji-ui/components/alert/alert.playground';
import { PLAYGROUND as AvatarPlayground } from '@kouji-ui/components/avatar/avatar.playground';
import { PLAYGROUND as BadgePlayground } from '@kouji-ui/components/badge/badge.playground';
import { PLAYGROUND as BreadcrumbPlayground } from '@kouji-ui/components/breadcrumb/breadcrumb.playground';
import { PLAYGROUND as ButtonPlayground } from '@kouji-ui/components/button/button.playground';
import { PLAYGROUND as ButtonGroupPlayground } from '@kouji-ui/components/button-group/button-group.playground';
import { PLAYGROUND as CalendarPlayground } from '@kouji-ui/components/calendar/calendar.playground';
import { PLAYGROUND as CardPlayground } from '@kouji-ui/components/card/card.playground';
import { PLAYGROUND as CarouselPlayground } from '@kouji-ui/components/carousel/carousel.playground';
import { PLAYGROUND as CascadeSelectPlayground } from '@kouji-ui/components/cascade-select/cascade-select.playground';
import { PLAYGROUND as ChatPlayground } from '@kouji-ui/components/chat/chat.playground';

/**
 * Bucket A migrations. Keys are `DocItem.symbol` (e.g. `KjButtonComponent`)
 * matching the directive / component the docs page is built around.
 *
 * Each value imports the `PLAYGROUND` export from the component's
 * `<comp>.playground.ts` file co-located in `packages/components/src/<comp>/`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BUCKET_A_FILES: Record<string, PlaygroundFile> = {
  KjAccordionComponent: AccordionPlayground,
  KjAlertComponent: AlertPlayground,
  KjAvatarGroupComponent: AvatarPlayground,
  KjBadgeComponent: BadgePlayground,
  KjBreadcrumbComponent: BreadcrumbPlayground,
  KjButtonComponent: ButtonPlayground,
  KjButtonGroupComponent: ButtonGroupPlayground,
  KjCalendarComponent: CalendarPlayground,
  KjCardComponent: CardPlayground,
  KjCarouselComponent: CarouselPlayground,
  KjCascadeSelectComponent: CascadeSelectPlayground,
  KjChatLogComponent: ChatPlayground,
};
