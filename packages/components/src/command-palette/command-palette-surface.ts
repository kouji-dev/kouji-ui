import {
  Directive,
} from '@angular/core';
import {
  KJ_OVERLAY_BACKDROP_STRATEGY,
  KJ_OVERLAY_FOCUS_TRAP_STRATEGY,
  KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY,
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  KJ_OVERLAY_POSITION_STRATEGY,
  KJ_OVERLAY_SCROLL_LOCK_STRATEGY,
  KjOverlayPanel,
  blurredBackdrop,
  bodyPortal,
  htmlOverflow,
  inPlaceSibling,
  silent,
  tabCycle,
} from '@kouji-ui/core';

/**
 * The palette's overlay surface: the element that IS the overlay panel.
 *
 * It exists so the strategy bundle lives on an element inside
 * `<kj-command-palette>`'s own view rather than on the component host. An
 * element-injector lookup from projected content walks the *declaration*
 * tree, so providers on the component host would be inherited by anything a
 * consumer projects into the palette — a nested `<kj-select>`, which declares
 * mount, position and role but no backdrop, would have picked up the
 * palette's scrim, page inerting and scroll lock and rendered its own dimmed
 * modal listbox. Only `KjOverlayController` stays on the host, where the
 * component and this panel share the one instance.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: '[kjCommandPaletteSurface]',
  standalone: true,
  hostDirectives: [KjOverlayPanel],
  providers: [
    // Portalled into the shared overlay container, so a select, popover or
    // dialog opened from inside the palette gets the next stack level up
    // instead of landing behind the palette's own z-index.
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    // The panel places itself from the stylesheet (fixed, 15vh from the top,
    // horizontally centred); nothing writes inline geometry over that.
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => inPlaceSibling() },
    { provide: KJ_OVERLAY_BACKDROP_STRATEGY, useFactory: () => blurredBackdrop({ inert: true, closeOnClick: true }) },
    { provide: KJ_OVERLAY_FOCUS_TRAP_STRATEGY, useFactory: () => tabCycle({ initialFocus: 'first', returnFocus: true }) },
    { provide: KJ_OVERLAY_SCROLL_LOCK_STRATEGY, useFactory: () => htmlOverflow() },
    { provide: KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY, useFactory: () => silent() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
  ],
})
export class KjCommandPaletteSurface {}
