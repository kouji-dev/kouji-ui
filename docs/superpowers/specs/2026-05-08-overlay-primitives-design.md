# Overlay primitives — design spec

**Date:** 2026-05-08
**Branch:** `feat/overlay-primitives`
**Scope:** Cat 1 of `docs/audits/patterns-and-duplications.md` — full overlay refactor (primitives + 13 component refactors + 6 mergers).
**Target:** big-bang refactor on a single branch; major version bump on merge.
**A11Y target:** WCAG 2.1 AAA preserved per existing component contracts.

## 1. Goals & non-goals

### Goals
- Replace ad-hoc overlay logic across 18 components with a single composable primitive set.
- Preserve every existing ARIA contract (`tooltip`, `dialog`, `alertdialog`, `menu`, `listbox`, `tree`, `status`, `alert`).
- Allow internal pluggability via strategy interfaces for: mounting, positioning, backdrop, focus-trap, scroll-lock, live-announcer, trigger event.
- Net 18 → 13 components by absorbing variants (hovercard, context-menu, alert-dialog, bottom-sheet, inline menu, multi-select).
- Service-launched overlays (dialog/drawer/toast) and declarative overlays (popover/tooltip/menu/etc.) converge on the same `KjOverlayController`.

### Non-goals
- Strategy interfaces are **internal infrastructure**, not exposed to library users.
- Virtualization, drag-to-resize generalization, i18n of hardcoded strings, async resource loading, animation libraries — out of scope; tracked separately.
- No CDK dependency.

## 2. Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│                  KjOverlayController                          │
│  Per-overlay orchestrator. Owns lifecycle + state machine.    │
│                                                               │
│  Public state (signals):                                      │
│    state(): 'closed'|'opening'|'open'|'closing'              │
│    isOpen() (derived)                                         │
│  Methods:                                                     │
│    open() / close() / toggle() / dispose()                    │
│  Strategy slots (DI tokens):                                  │
│    mount, position, backdrop, focusTrap, scrollLock,         │
│    liveAnnouncer, triggerEvent                                │
│  Always-on:                                                   │
│    stack registration (esc + outside-click routing)           │
│  Element refs:                                                │
│    triggerEl, panelEl, returnFocusEl                          │
└──────────▲────────────────────────────────────────▲──────────┘
           │                                        │
   Declarative path                         Imperative path
           │                                        │
  trigger directive                         service facade
  (e.g. KjPopoverTrigger)                   (e.g. KjDialog.open)
  provides controller                       calls KjOverlayBuilder
  via providers[]                           which builds + returns ctrl
           │                                        │
           ▼                                        ▼
   Panel injects ctrl                       Component attached
   via [kjFor]="trigger"                    to ctrl programmatically
   Wired by KjOverlayPanel                  Service returns ref
   (host directive)                         to consumer
           │                                        │
           └────────────────┬───────────────────────┘
                            ▼
        ┌──────────────────────────────────────┐
        │  Strategy layer — interfaces +       │
        │  factory functions / classes:        │
        │   KjMountStrategy                     │
        │   KjPositionStrategy                  │
        │   KjBackdropStrategy                  │
        │   KjFocusTrapStrategy                 │
        │   KjScrollLockStrategy                │
        │   KjLiveAnnouncerStrategy             │
        │   KjTriggerEventStrategy              │
        └──────────────────────────────────────┘
```

### Construct lifetimes

| Construct | Kind | Lifetime |
|---|---|---|
| `KjOverlayController<T>` | class instance, provided **per overlay instance** (one per trigger directive in declarative path; one per service-opened overlay in imperative path) | created when trigger directive mounts / service opens; disposed on directive destroy / overlay close (service path) |
| `KjOverlayTrigger` | host directive | composed onto consumer trigger directives |
| `KjOverlayPanel` | host directive | composed onto consumer panel components |
| `KjOverlayBuilder` | injectable service (`providedIn: 'root'`) | one app-wide instance; produces controllers for the service path |
| Strategy factory functions | pure functions | per-overlay |
| `KjOverlayStack` | injectable service (`providedIn: 'root'`) | global; manages topmost-only Esc + outside-click |
| `KjScrollLock` | injectable service (`providedIn: 'root'`) | global; ref-counted body lock |
| `KjLiveAnnouncerService` | injectable service (`providedIn: 'root'`) | global polite + assertive regions |

### Trigger ↔ panel pairing

```html
<!-- declarative path -->
<button kjPopoverTrigger #t="kjPopoverTrigger" kjSide="bottom">Open</button>
<kj-popover-content [kjFor]="t">…</kj-popover-content>

<!-- imperative path -->
this.dialog.open(MyConfirmCmp, { data: {...} })
```

Trigger directive provides `KjOverlayController` via `providers`. Panel injects same instance via `[kjFor]="t"` template ref → `t.attachPanel(this)`. Both directives configure strategies via DI tokens.

## 3. Strategy interfaces

### Common shape

```ts
interface KjStrategy {
  attach(ctx: KjOverlayContext): void;
  onOpen?(): void;
  onClose?(): void;
  detach(): void;
}

interface KjOverlayContext {
  readonly state: Signal<'closed'|'opening'|'open'|'closing'>;
  readonly isOpen: Signal<boolean>;
  readonly triggerEl: Signal<HTMLElement | null>;
  readonly panelEl:   Signal<HTMLElement | null>;
  readonly stack:     KjOverlayStack;
  readonly platform:  { isBrowser: boolean };
  requestClose(reason: 'esc'|'outside'|'programmatic'): void;
}
```

### Per-strategy interfaces and factories

```ts
// Mount
interface KjMountStrategy extends KjStrategy {
  resolveContainer(): HTMLElement;
  readonly portalled: boolean;
}
bodyPortal(): KjMountStrategy
inPlace():    KjMountStrategy
inContainer(target: HTMLElement | (() => HTMLElement)): KjMountStrategy

// Position
interface KjPositionStrategy extends KjStrategy {
  update(): void;
  readonly placement?: Signal<{ side: KjSide; align: KjAlign } | null>;
}
anchoredTo(opts: { trigger, side, align, offset?, flip?, shift? }): KjPositionStrategy
viewportCentered(): KjPositionStrategy
edgeSheet(opts: { side: 'left'|'right'|'top'|'bottom' }): KjPositionStrategy
pointAt(opts: { x, y }): KjPositionStrategy
corner(opts: { position: 'top-left'|'top-right'|'bottom-left'|'bottom-right'; offset? }): KjPositionStrategy
inPlaceSibling(): KjPositionStrategy

// Backdrop
interface KjBackdropStrategy extends KjStrategy {
  readonly inertSiblings: boolean;
  readonly closeOnClick:  boolean;
}
solidBackdrop(opts?: { inert?, closeOnClick?, className? }): KjBackdropStrategy
blurredBackdrop(opts?): KjBackdropStrategy
none(): KjBackdropStrategy

// Focus trap
interface KjFocusTrapStrategy extends KjStrategy {
  focusFirst(): void;
  restoreFocus(): void;
}
tabCycle(opts?: { initialFocus?, returnFocus? }): KjFocusTrapStrategy
inertBased(): KjFocusTrapStrategy
noTrap(): KjFocusTrapStrategy

// Scroll lock
interface KjScrollLockStrategy extends KjStrategy {}
htmlOverflow(): KjScrollLockStrategy
cssClip():     KjScrollLockStrategy
none():        KjScrollLockStrategy

// Live announcer
interface KjLiveAnnouncerStrategy extends KjStrategy {
  announce(message: string): void;
}
polite():    KjLiveAnnouncerStrategy
assertive(): KjLiveAnnouncerStrategy
silent():    KjLiveAnnouncerStrategy

// Trigger event
interface KjTriggerEventStrategy extends KjStrategy {
  readonly ariaHasPopup: 'menu'|'listbox'|'tree'|'grid'|'dialog'|null;
}
onClick(): KjTriggerEventStrategy
onHover(opts?: { openDelay?, closeDelay? }): KjTriggerEventStrategy
onFocus(): KjTriggerEventStrategy
onContextMenu(opts?: { longPressMs? }): KjTriggerEventStrategy
onHotkey(chord: string): KjTriggerEventStrategy
onFocusOrInput(): KjTriggerEventStrategy
programmatic(): KjTriggerEventStrategy
```

### DI tokens

```ts
const KJ_OVERLAY_MOUNT_STRATEGY            = new InjectionToken<KjMountStrategy>('...');
const KJ_OVERLAY_POSITION_STRATEGY         = new InjectionToken<KjPositionStrategy>('...');
const KJ_OVERLAY_BACKDROP_STRATEGY         = new InjectionToken<KjBackdropStrategy | null>('...');
const KJ_OVERLAY_FOCUS_TRAP_STRATEGY       = new InjectionToken<KjFocusTrapStrategy>('...');
const KJ_OVERLAY_SCROLL_LOCK_STRATEGY      = new InjectionToken<KjScrollLockStrategy>('...');
const KJ_OVERLAY_LIVE_ANNOUNCER_STRATEGY   = new InjectionToken<KjLiveAnnouncerStrategy>('...');
const KJ_OVERLAY_TRIGGER_EVENT_STRATEGY    = new InjectionToken<KjTriggerEventStrategy>('...');
const KJ_OVERLAY_PANEL_ROLE                = new InjectionToken<'dialog'|'alertdialog'|'tooltip'|'menu'|'listbox'|'tree'|'status'|'alert'>('...');
```

### Lifecycle ordering inside the controller

`attach(ctx)` runs **once** at controller construction (binds the strategy to the context). `detach()` runs **once** at controller dispose. `onOpen()`/`onClose()` run per open/close cycle.

```
controller construction
  └─ for each strategy: attach(ctx)        (binds context, no DOM work yet)

open()
  ├─ mount.onOpen()                        (creates DOM container, mounts panel)
  ├─ position.onOpen() / .update()         (computes placement)
  ├─ backdrop?.onOpen()                    (renders backdrop, applies inert)
  ├─ scrollLock?.onOpen()                  (acquires lock)
  ├─ stack.register()                      (joins esc/outside-click stack)
  ├─ state → 'opening'
  ├─ next-frame paint
  ├─ state → 'open' (after CSS animation/transition end OR immediate if none)
  ├─ focusTrap.focusFirst()
  └─ liveAnnouncer.announce(message?)

close()
  ├─ state → 'closing'
  ├─ wait CSS animation/transition end
  ├─ state → 'closed'
  ├─ focusTrap.restoreFocus()
  ├─ stack.unregister()
  ├─ scrollLock?.onClose()                 (releases lock)
  ├─ backdrop?.onClose()
  ├─ position.onClose()
  └─ mount.onClose()                       (removes DOM)

controller dispose
  └─ for each strategy: detach()           (releases any subscriptions / observers)
```

## 4. Core directives

### `KjOverlayTrigger` (host directive on the trigger element)

```ts
@Directive({
  selector: '[kjOverlayTrigger]',
  exportAs: 'kjOverlayTrigger',
  host: {
    '[attr.aria-haspopup]':  'ariaHasPopup() ?? null',
    '[attr.aria-expanded]':  'isOpen()',
    '[attr.aria-controls]':  'panelId() ?? null',
    '[attr.data-state]':     'state()',
  },
})
export class KjOverlayTrigger {
  readonly kjOpen = model<boolean>(false);
  readonly state   = ...;
  readonly isOpen  = ...;
  readonly panelId = ...;
  readonly ariaHasPopup = ...;

  attachPanel(panel: KjOverlayPanel): void;
}
```

### `KjOverlayPanel` (host directive on the panel element)

```ts
@Directive({
  selector: '[kjOverlayPanel]',
  exportAs: 'kjOverlayPanel',
  host: {
    '[id]':                  'panelId',
    '[attr.role]':           'role()',
    '[attr.aria-modal]':     'isModal() ? "true" : null',
    '[attr.data-state]':     'state()',
    '[attr.hidden]':         'state() === "closed" ? "" : null',
  },
})
export class KjOverlayPanel {
  readonly host = ...;
  readonly panelId = `kj-panel-${nextId()}`;
  readonly kjFor = input.required<KjOverlayTrigger | null>();
  // resolves all strategy DI tokens; calls kjFor().attachPanel(this) when ready
}
```

### `KjFocusTrap` directive — declarative form of `tabCycle()`

Optional companion when consumer wants to declare the trap on a specific descendant.

### `KjBackdrop` component — declarative backdrop

Used inside `<kj-dialog>` / `<kj-drawer>` body templates; resolves the backdrop strategy via DI.

### Service path — `KjOverlayBuilder`

```ts
@Injectable({ providedIn: 'root' })
export class KjOverlayBuilder {
  create(config: KjOverlayConfig): KjOverlayController;
  attachComponent<T>(controller, component, opts): ComponentRef<T>;
}
```

### Service path — `KjDialog`, `KjDrawer`, `KjToast`

```ts
@Injectable({ providedIn: 'root' })
export class KjDialog {
  open<T, R>(component: Type<T>, opts?: KjDialogOpenOptions): KjDialogRef<T, R>;
  alert(opts):   KjDialogRef<KjAlertCmp, void>;
  confirm(opts): KjDialogRef<KjConfirmCmp, boolean>;
  prompt(opts):  KjDialogRef<KjPromptCmp, string | null>;
}

export class KjDialogRef<T, R = unknown> {
  readonly controller: KjOverlayController;
  readonly instance: T;
  readonly state:  Signal<'closed'|'opening'|'open'|'closing'>;
  readonly isOpen: Signal<boolean>;
  readonly result: Promise<R | undefined>;
  readonly afterOpened$:  Observable<void>;
  readonly afterClosed$:  Observable<R | undefined>;
  close(result?: R): void;
}
```

### Construction order — service path

```ts
open<T, R>(component, opts) {
  const controller = this.builder.create({ /* preset config */ });   // 1
  const ref = new KjDialogRef<T, R>(controller);                     // 2 — ref exists before component
  const cmpRef = this.builder.attachComponent(controller, component, {
    providers: [{ provide: KjDialogRef, useValue: ref }],            // 3 — ref injectable in component
    data: opts?.data,
  });
  ref.bindInstance(cmpRef.instance);
  controller.open();                                                 // 4
  return ref;                                                        // 5
}
```

## 5. Per-component composition (after 6 mergers, 18 → 13)

| Component | Trigger directive | Panel directive | Trigger strategy | Position | Mount | Backdrop | Focus trap | Scroll lock | Live announcer | Panel role | Notable inputs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **KjTooltip** | `KjTooltipTrigger` | `KjTooltipContent` | `onHover({openDelay:200})` + `onFocus()` | `anchoredTo({...})` | `bodyPortal()` | `none()` | `noTrap()` | `none()` | `silent()` | `tooltip` | `kjSide`, `kjAlign`, `kjOpenDelay` |
| **KjPopover** *(absorbs hovercard)* | `KjPopoverTrigger` | `KjPopoverContent` | from `kjTrigger`: `onClick()` \| `onHover()` | `anchoredTo({...})` | `bodyPortal()` | `none()` | opt-in `tabCycle()` via `kjTrap` | `none()` | `silent()` | `dialog` | `kjTrigger`, `kjSide`, `kjAlign`, `kjTrap` |
| **KjDropdownMenu** *(absorbs context-menu + inline menu)* | `KjDropdownMenuTrigger` | `KjDropdownMenuContent` | from `kjTrigger`: `onClick()` \| `onContextMenu()` | from `kjMount`: `anchoredTo()` \| `pointAt()` \| `inPlaceSibling()` | from `kjMount`: `bodyPortal()` \| `inPlace()` | `none()` | `noTrap()` | `none()` | `silent()` | `menu` | `kjTrigger`, `kjMount`, `kjSide`, `kjAlign` |
| **KjDialog** *(absorbs alert-dialog)* | — | `<kj-dialog>` | `programmatic()` | `viewportCentered()` | `bodyPortal()` | `solidBackdrop()` | `tabCycle()` | `htmlOverflow()` | `silent()` \| `assertive()` (when `kjAlert`) | `dialog` \| `alertdialog` | `kjAlert` |
| **KjDrawer** *(absorbs bottom-sheet)* | — | `<kj-drawer>` | `programmatic()` | `edgeSheet({side: kjSide})` | `bodyPortal()` | `solidBackdrop()` | `tabCycle()` | `htmlOverflow()` | `silent()` | `dialog` | `kjSide`, `kjDrag` |
| **KjToast** | — | `<kj-toast-viewport>` | `programmatic()` | `corner({position: kjPosition})` | `bodyPortal()` | `none()` | `noTrap()` | `none()` | `polite()` \| `assertive()` | `status` \| `alert` | `kjPosition`, `kjVariant`, `kjDuration` |
| **KjSelect** *(absorbs multi-select)* | `KjSelectTrigger` | `KjSelectContent` | `onClick()` | `anchoredTo({...})` | `bodyPortal()` | `none()` | `noTrap()` | `none()` | `silent()` | `listbox` | `kjMultiple`, `kjSide`, `kjAlign` |
| **KjCombobox** | `KjComboboxInput` | `KjComboboxContent` | `onFocusOrInput()` | `anchoredTo({...})` | `bodyPortal()` | `none()` | `noTrap()` | `none()` | `silent()` | `listbox` | `kjFilter`, `kjFreeText` |
| **KjCommandPalette** | `KjCommandPaletteTrigger` | `<kj-command-palette>` | `onHotkey('mod+k')` \| `programmatic()` | `viewportCentered()` | `bodyPortal()` | `solidBackdrop()` | `tabCycle()` | `htmlOverflow()` | `silent()` | `dialog` | `kjItems`, `kjFilter`, `kjHotkey` |
| **KjTreeSelect** | `KjTreeSelectTrigger` | `KjTreeSelectContent` | `onClick()` | `anchoredTo({...})` | `bodyPortal()` | `none()` | `noTrap()` | `none()` | `silent()` | `tree` | `kjMultiple`, `kjSide`, `kjAlign` |
| **KjCascadeSelect** | `KjCascadeSelectTrigger` | `KjCascadeSelectContent` | `onClick()` | `anchoredTo({...})` (root + sub-panels) | `bodyPortal()` | `none()` | `noTrap()` | `none()` | `silent()` | `listbox` | `kjLeafOnly`, `kjSide`, `kjAlign` |
| **KjDatePicker** | `KjDatePickerTrigger` | `KjDatePickerContent` | `onFocus()` + `onClick()` | `anchoredTo({...})` | `bodyPortal()` | `none()` | `noTrap()` | `none()` | `silent()` | `dialog` | `kjMin`, `kjMax`, `kjSide`, `kjAlign` |
| **KjColorPicker** | `KjColorPickerTrigger` | `KjColorPickerContent` | `onClick()` | `anchoredTo({...})` | `bodyPortal()` | `none()` | `noTrap()` | `none()` | `silent()` | `dialog` | `kjFormat`, `kjSide`, `kjAlign` |

### Merged component dispatch

| Merged in | Implementation knob | Effect |
|---|---|---|
| hovercard → popover | `kjTrigger="hover"` | swap trigger event strategy `onClick` → `onHover` |
| context-menu → dropdown-menu | `kjTrigger="contextmenu"` + `kjMount="point"` | swap to `onContextMenu` + `pointAt(eventCoords)` |
| inline menu → dropdown-menu | `kjMount="inline"` | swap mount `bodyPortal` → `inPlace`, position → `inPlaceSibling` |
| alert-dialog → dialog | `kjAlert=true` | role becomes `alertdialog`; `closeOnEsc=false`; `closeOnOutside=false`; live announcer becomes `assertive()` |
| bottom-sheet → drawer | `kjSide="bottom"` + `kjDrag=true` | edge-sheet position; drag-to-dismiss handle enabled |
| multi-select → select | `kjMultiple=true` | `aria-multiselectable=true`; selection model multi (cat 2 concern) |

### Sugar service wrappers

| Sugar | Returns |
|---|---|
| `KjDialog.alert(opts)` | `KjDialogRef<KjAlertCmp, void>` |
| `KjDialog.confirm(opts)` | `KjDialogRef<KjConfirmCmp, boolean>` |
| `KjDialog.prompt(opts)` | `KjDialogRef<KjPromptCmp, string \| null>` |
| `KjDrawer.open(Cmp, opts)` | `KjDrawerRef<T, R>` |
| `KjToast.{success,info,warn,error}(opts)` | `KjToastRef` |

## 6. State machine

```
                  open() called
   closed ─────────────────────────► opening
      ▲                                 │
      │                                 │  next-frame paint
      │                                 ▼
      │                       (CSS transition runs)
      │                                 │
      │                          transitionend OR
      │                          immediate (no transition)
      │                                 │
      │                                 ▼
      │                                open
      │                                 │
      │                          close() called
      │                                 │
      │                                 ▼
      │                              closing
      │                                 │
      │  transitionend OR               │  (CSS transition runs)
      │  immediate (no transition)      │
      └─────────────────────────────────┘
```

| Transition | Trigger | What happens |
|---|---|---|
| `closed → opening` | `open()` | mount + position + backdrop + scroll-lock attached; stack registered; `data-state="opening"` |
| `opening → open` | `transitionend` OR `requestAnimationFrame` if no transition | `data-state="open"`; `focusTrap.focusFirst()`; `liveAnnouncer.announce()`; `afterOpened$` emits |
| `open → closing` | `close()` | `data-state="closing"` |
| `closing → closed` | `transitionend` OR `requestAnimationFrame` | `focusTrap.restoreFocus()`; stack unregister; scroll-lock release; backdrop detach; mount detach; `afterClosed$` emits with result |

**No-animation detection:** after `data-state` flips, controller listens for both `transitionend` and `animationend` on the panel. If `getComputedStyle(panel).transitionDuration === '0s'` AND `animationDuration === '0s'`, the controller short-circuits to next state on the next frame instead of waiting for an event that will never fire. Supports CSS transitions, CSS animations, or none.

**Cancellation:** opening↔closing reversible. State machine handles bidirectional transitions; `transitionend` listeners are one-shot.

**Reduced motion:** when `prefers-reduced-motion: reduce`, controller skips `opening`/`closing` and goes straight `closed ↔ open` on next frame.

### Edge cases

| Case | Behaviour |
|---|---|
| `open()` called while already opening/open | no-op |
| `close()` called while already closing/closed | no-op |
| `open()` while closing | flips to opening |
| `close()` while opening | flips to closing |
| trigger destroyed while panel open | controller closes immediately + disposes |
| panel destroyed while open | controller closes immediately + disposes |
| Esc when not topmost | ignored (stack) |
| outside click when not topmost | ignored |
| outside click on backdrop when `closeOnClick=false` | no-op |
| `data-state` changes during transition | new transition starts; old listener auto-removed |
| Component throws inside `open()` lifecycle | strategies that already attached are detached in reverse order |

## 7. ARIA contracts per panel role

| Role | Panel attrs | Trigger attrs | Esc | Outside | Focus inside | Live region | Notes |
|---|---|---|---|---|---|---|---|
| `tooltip` | `role="tooltip"`, `id` | `aria-describedby` (NOT `aria-controls`) | ✅ | ❌ | none | none | only role using describedby |
| `dialog` | `role="dialog"`, `aria-modal="true"` (modal), `aria-labelledby`, `aria-describedby`, `id` | `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` | ✅ | configurable | trapped | optional polite | |
| `alertdialog` | same as `dialog` but `role="alertdialog"` | `aria-haspopup="dialog"`, others same | ❌ default | ❌ default | trapped | assertive on open | destructive confirms |
| `menu` | `role="menu"`, `id`, `aria-orientation` | `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` | ✅ | ✅ | virtual (cat 2) | none | items `role="menuitem"` |
| `listbox` | `role="listbox"`, `id`, `aria-multiselectable`, `aria-activedescendant` | `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` | ✅ | ✅ | virtual | none | items `role="option"` |
| `tree` | `role="tree"`, `id`, `aria-multiselectable` | `aria-haspopup="tree"`, `aria-expanded`, `aria-controls` | ✅ | ✅ | roving | none | items `role="treeitem"`, `aria-level`, `aria-expanded` |
| `status` | `role="status"`, `aria-live="polite"`, `aria-atomic="true"` | none | ✅ | ❌ | none | inherent | toast |
| `alert` | `role="alert"`, `aria-live="assertive"`, `aria-atomic="true"` | none | ❌ | ❌ | none | inherent | error toast / critical |

## 8. SSR behaviour

| Primitive | SSR behaviour |
|---|---|
| `KjOverlayController` | constructs fine; signals work; element refs `null` until afterRender |
| `KjOverlayTrigger` directive | host bindings (signals) work; event listeners attach in `afterNextRender` |
| `KjOverlayPanel` directive | same; mount strategy is no-op on server |
| `bodyPortal()` | server: panel inline; browser: appends to `document.body` after `afterNextRender` |
| `inPlace()` | identical on server and browser |
| `anchoredTo()` | server: no positioning styles; browser: CSS Anchor / fallback math after `afterNextRender` |
| `viewportCentered()` | server: emits CSS only |
| `solidBackdrop()` | server: backdrop element with `data-state="closed"` (hidden via CSS) |
| `tabCycle()` | server: no-op; browser: focus moves on open |
| `htmlOverflow()` | server: no-op; browser: ref-counted lock |
| `KjScrollLock` / `KjOverlayStack` / `KjLiveAnnouncerService` | every `document` access guarded by `isPlatformBrowser` |

**Hydration:** panels with `data-state="closed"` rendered on server stay hidden through hydration via `[hidden]`. Once hydrated, trigger opens normally. No flash of unhidden content.

**Stable ids:** `KjOverlayPanel.panelId` uses SSR-deterministic id minter (`KjId` from cat 7), preventing hydration mismatches on `aria-controls` / `aria-describedby`.

## 9. File structure

```
packages/core/src/
├── primitives/
│   └── overlay/
│       ├── controller.ts                  // KjOverlayController
│       ├── controller.spec.ts
│       ├── context.ts                     // KjOverlayContext interface
│       ├── tokens.ts                      // all KJ_OVERLAY_* DI tokens
│       ├── stack.ts                       // KjOverlayStack service
│       ├── stack.spec.ts
│       ├── scroll-lock.ts                 // KjScrollLock service
│       ├── scroll-lock.spec.ts
│       ├── live-announcer.ts              // KjLiveAnnouncerService
│       ├── live-announcer.spec.ts
│       ├── builder.ts                     // KjOverlayBuilder service
│       ├── builder.spec.ts
│       │
│       ├── trigger.ts                     // KjOverlayTrigger directive
│       ├── trigger.spec.ts
│       ├── panel.ts                       // KjOverlayPanel directive
│       ├── panel.spec.ts
│       ├── focus-trap.ts                  // KjFocusTrap directive
│       ├── focus-trap.spec.ts
│       ├── backdrop.ts                    // KjBackdrop component
│       ├── backdrop.spec.ts
│       │
│       ├── strategies/
│       │   ├── mount/{body-portal, in-place, in-container}.ts
│       │   ├── position/{anchored-to, viewport-centered, edge-sheet, point-at, corner, in-place-sibling}.ts
│       │   ├── backdrop/{solid, blurred, none}.ts
│       │   ├── focus-trap/{tab-cycle, inert-based, no-trap}.ts
│       │   ├── scroll-lock/{html-overflow, css-clip, none}.ts
│       │   ├── live-announcer/{polite, assertive, silent}.ts
│       │   ├── trigger-event/{on-click, on-hover, on-focus, on-context-menu, on-hotkey, on-focus-or-input, programmatic}.ts
│       │   └── index.ts
│       │
│       ├── types.ts
│       └── index.ts
│
├── tooltip/, popover/, dialog/, drawer/, toast/
├── dropdown-menu/, select/, combobox/, command-palette/
├── tree-select/, cascade-select/, date-picker/, color-picker/
└── …

# Removed
- packages/core/src/hovercard/
- packages/core/src/context-menu/
- packages/core/src/alert-dialog/
- packages/core/src/bottom-sheet/
- packages/core/src/menu/                  // inline menu only — folded into dropdown-menu
- packages/core/src/multi-select/
- packages/core/src/primitives/overlay/overlay.ts  (KjOverlayService — replaced)
- packages/core/src/primitives/overlay/anchor.ts   (KjAnchor directive — replaced by anchoredTo() strategy)
```

## 10. Per-component before/after

| Existing path | Action | Notes |
|---|---|---|
| `tooltip/` | refactor | onHover+onFocus, role=tooltip |
| `popover/` | refactor | absorbs hovercard via kjTrigger |
| `hovercard/` | DELETE folder | folded into popover |
| `dialog/` | refactor | absorbs alert-dialog via kjAlert |
| `alert-dialog/` | DELETE folder | folded into dialog |
| `drawer/` | refactor | absorbs bottom-sheet via kjSide+kjDrag |
| `bottom-sheet/` | DELETE folder | folded into drawer |
| `toast/` | refactor | service-driven, polite/assertive |
| `dropdown-menu/` | refactor | absorbs context-menu and inline menu |
| `context-menu/` | DELETE folder | folded into dropdown-menu |
| `menu/` (inline) | DELETE folder | folded into dropdown-menu |
| `select/` | refactor | absorbs multi-select via kjMultiple |
| `multi-select/` | DELETE folder | folded into select |
| `combobox/` | refactor | role=listbox |
| `command-palette/` | refactor | onHotkey strategy replaces ad-hoc directive |
| `tree-select/` | refactor | role=tree |
| `cascade-select/` | refactor | sub-panels get own controllers |
| `date-picker/` | refactor | calendar panel via overlay primitives |
| `color-picker/` | refactor | color panel via overlay primitives |
| `overlay-badge/` | leave as-is | not an overlay |
| `primitives/overlay/overlay.ts` | DELETE | KjOverlayService replaced |
| `primitives/overlay/anchor.ts` | DELETE | KjAnchor replaced by strategy |

## 11. Migration order on `feat/overlay-primitives`

Single branch, big-bang. Within the branch, work in this order so each commit leaves the branch buildable.

| Step | What | Why |
|---|---|---|
| 1. Foundations | `KjOverlayStack`, `KjScrollLock`, `KjLiveAnnouncerService`, `KjId` (cat 7 dep), `KjOverlayController`, `KjOverlayBuilder`, all DI tokens, all strategy implementations | additive; old `KjOverlayService` still parallel |
| 2. Core directives | `KjOverlayTrigger`, `KjOverlayPanel`, `KjFocusTrap`, `KjBackdrop` | strategies needed before directives |
| 3. Component migrations (per commit) | tooltip, popover, dropdown-menu, select, combobox, command-palette, tree-select, cascade-select, date-picker, color-picker, dialog (+presets), drawer, toast | each component on new primitives |
| 4. Mergers (per commit) | absorb hovercard, context-menu, alert-dialog, bottom-sheet, inline menu, multi-select | source folder deleted, target gains variant inputs, examples updated, tests merged |
| 5. Old service removal | delete `KjOverlayService`, `KjOverlayRef`, `KjAnchor` directive | unreferenced |
| 6. Doc + example sweep | update docs/examples for renamed components | required for site build |
| 7. Changeset + version bump | major version bump | breaking |

Each step: a commit (or PR) that builds + lints + tests. Branch always green.

## 12. Testing strategy

| Layer | Test type | Tool | Coverage target |
|---|---|---|---|
| Strategy implementations | unit | vitest | 90%+ |
| `KjOverlayController` state machine | unit + jsdom | vitest | every transition + cancellation case |
| `KjOverlayStack` / `KjScrollLock` / `KjLiveAnnouncer` | unit | vitest | ref-counting, topmost routing, SSR no-op |
| `KjOverlayTrigger` / `KjOverlayPanel` directives | integration | vitest + testing-library/angular | host bindings + DI wiring |
| Library components | integration | vitest + testing-library | trigger ↔ panel pairing, A11Y attrs, kbd |
| Cross-component (focus return, stack ordering) | E2E | Playwright | nested overlays, modal backdrop inert, focus trap |
| ARIA contracts per role | accessibility | axe-core via vitest + Playwright | every panel role passes axe |
| Reduced-motion | E2E | Playwright `emulateMedia` | state machine short-circuits |
| SSR | unit | vitest with `provideServerRendering` | no `document` access errors |

Each library component keeps its own `*.spec.ts`. Mergers add tests for merged variants (e.g. `dropdown-menu.spec.ts` covers `kjTrigger="contextmenu"`).

## 13. Public API surface

| Layer | Symbols |
|---|---|
| **Directives** | `kjTooltip`, `kjTooltipTrigger`/`Content`, `kjPopoverTrigger`/`Content`, `kjDropdownMenuTrigger`/`Content`, `kjSelectTrigger`/`Content`, `kjComboboxInput`/`Content`, `kjTreeSelectTrigger`/`Content`, `kjCascadeSelectTrigger`/`Content`, `kjDatePickerTrigger`/`Content`, `kjColorPickerTrigger`/`Content`, `kjCommandPaletteTrigger` |
| **Components** | `<kj-popover-content>`, `<kj-dialog>` (+ children), `<kj-drawer>` (+ children), `<kj-toast-viewport>`, `<kj-dropdown-menu>` (+ items), `<kj-select>` (+ `<kj-option>`), `<kj-combobox>`, `<kj-command-palette>`, `<kj-tree-select>`, `<kj-cascade-select>`, `<kj-date-picker>`, `<kj-color-picker>`, `<kj-toast>` |
| **Services** | `KjDialog`, `KjDrawer`, `KjToast`, `KjOverlayBuilder` (low-level) |
| **Internal primitives** | `KjOverlayController`, `KjOverlayTrigger`, `KjOverlayPanel`, `KjFocusTrap`, `KjBackdrop`, `KjOverlayStack`, `KjScrollLock`, `KjLiveAnnouncerService`, all DI tokens, all strategy factory functions |
| **Removed** | `KjOverlayService`, `KjOverlayRef`, `KjAnchor` directive, hovercard, context-menu, alert-dialog, bottom-sheet, inline menu, multi-select |

## 14. Out of scope

| Item | Reason |
|---|---|
| Virtualization in dropdown/select panels | cat 4 / future; doesn't affect overlay primitives |
| Drag-to-resize / drag-to-dismiss generalization | tracked separately |
| Internationalization of hardcoded strings | cat 7 roadmap; separate spec |
| Empty / loading / error state UI inside panels | tracked separately |
| Async resource loading | tracked separately |
| Animation library integration | consumers add their own; we orchestrate `data-state` only |

## 15. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Long-running branch, merge conflicts | per-component commits; rebase main daily; doc/example sweep at the end |
| Behavioural regression in absorbed components | preserve all existing tests; add merged-variant tests |
| `data-state` CSS animations break for consumers without explicit transition | controller short-circuits when `transitionDuration === 0s` |
| SSR hydration mismatches | deterministic `KjId`; `[hidden]` on closed panels |
| `aria-keyshortcuts` advertising shortcut chips that don't bind | tracked in cat 7 roadmap; not blocking this spec |
| Strategy injection via DI tokens forces consumers to provide all tokens | all panel strategies marked `optional: true` except mount + position; sensible defaults in `KjOverlayBuilder.create` for service path |
