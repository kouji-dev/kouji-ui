import type { PlaygroundLoader } from '../playground-types';

/**
 * Bucket A migrations. Keys are `DocItem.symbol` (e.g. `KjButtonComponent`)
 * matching the directive / component the docs page is built around.
 *
 * Each value imports the `PLAYGROUND` export from the component's
 * `<comp>.playground.ts` file co-located in `packages/components/src/<comp>/`.
 */
export const BUCKET_A_LOADERS: Record<string, PlaygroundLoader> = {
  KjAccordionComponent: () => import('@kouji-ui/components/accordion/accordion.playground').then((m) => m.PLAYGROUND),
  KjAlertComponent: () => import('@kouji-ui/components/alert/alert.playground').then((m) => m.PLAYGROUND),
  KjAvatarGroupComponent: () => import('@kouji-ui/components/avatar/avatar.playground').then((m) => m.PLAYGROUND),
  KjBadgeComponent: () => import('@kouji-ui/components/badge/badge.playground').then((m) => m.PLAYGROUND),
  KjBreadcrumbComponent: () => import('@kouji-ui/components/breadcrumb/breadcrumb.playground').then((m) => m.PLAYGROUND),
  KjButtonComponent: () => import('@kouji-ui/components/button/button.playground').then((m) => m.PLAYGROUND),
  KjButtonGroupComponent: () => import('@kouji-ui/components/button-group/button-group.playground').then((m) => m.PLAYGROUND),
  KjCalendarComponent: () => import('@kouji-ui/components/calendar/calendar.playground').then((m) => m.PLAYGROUND),
  KjCard: () => import('@kouji-ui/components/card/card.playground').then((m) => m.PLAYGROUND),
  KjCarouselComponent: () => import('@kouji-ui/components/carousel/carousel.playground').then((m) => m.PLAYGROUND),
  KjCascadeSelectComponent: () => import('@kouji-ui/components/cascade-select/cascade-select.playground').then((m) => m.PLAYGROUND),
  KjChatLogComponent: () => import('@kouji-ui/components/chat/chat.playground').then((m) => m.PLAYGROUND),
};
