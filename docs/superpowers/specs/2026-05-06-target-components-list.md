# Target Components List — kouji-ui

**Date:** 2026-05-06
**Status:** Draft — pending user selection
**Worktree:** `kouji-target-components` (branch `target-components-list`)

## Purpose

Exhaustive list of every component found across PrimeNG, Angular Material, daisyUI, and shadcn/ui — plus library-logic additions — organized by the daisyUI category vocabulary already used by kouji-ui. The user marks `✓` (or `X`) in the **Keep?** column for every component to include in the kouji-ui roadmap. Nothing is filtered or excluded yet.

## How to use

For each row, put `✓` (or `X`) in the **Keep?** column to mark it as a target component. Leave blank to skip. Each row's **Sources** column links directly to the matching component page in each library that ships it — click `P`, `M`, `D`, or `S` to verify a row before deciding.

## Legend

- **Status:** ✓ ships in kouji-ui today · ◐ wrapper-in-flight per `2026-05-05-components-package-expansion-design.md` · ☐ gap
- **Sources:** `P` = PrimeNG · `M` = Angular Material · `D` = daisyUI · `S` = shadcn/ui (each is a clickable link to that library's docs page)

---

## 1. Actions


| Keep?                                                                                                                | Component        | Status | Sources                                                                                                                                                                           | Notes                               |
| -------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| ✓                                                                                                                    | Button           | ✓      | [P](https://primeng.org/button) [M](https://material.angular.dev/components/button) [D](https://daisyui.com/components/button/) [S](https://ui.shadcn.com/docs/components/button) |                                     |
| ✓                                                                                                                    | Button Group     | ☐      | [P](https://primeng.org/buttongroup) [S](https://ui.shadcn.com/docs/components/button-group)                                                                                      |                                     |
| ✓ can be merged with button group using an internal state like active                                                | Toggle Button    | ☐      | [P](https://primeng.org/togglebutton) [M](https://material.angular.dev/components/button-toggle)                                                                                  | Press-toggle (distinct from Switch) |
| ✓ can be merged with button group, and let the user configure dropdown on the second button...                       | Split Button     | ☐      | [P](https://primeng.org/splitbutton)                                                                                                                                              | Primary action + dropdown           |
| ✓ use primeng logic                                                                                                  | Speed Dial / FAB | ☐      | [P](https://primeng.org/speeddial) [D](https://daisyui.com/components/fab/)                                                                                                       | Floating action cluster             |
| ✓                                                                                                                    | Dialog           | ◐      | [P](https://primeng.org/dialog) [M](https://material.angular.dev/components/dialog) [D](https://daisyui.com/components/modal/) [S](https://ui.shadcn.com/docs/components/dialog)  |                                     |
| ✓ this is a helper/sugar simple confirmation dialog that can be done using a service instead of temlplate/component. | Alert Dialog     | ☐      | [P](https://primeng.org/confirmdialog) [S](https://ui.shadcn.com/docs/components/alert-dialog)                                                                                    | Confirmation/destructive prompt     |
| ✓ sugar/helper directive                                                                                             | Confirm Popup    | ☐      | [P](https://primeng.org/confirmpopup)                                                                                                                                             | Inline anchored confirm             |
| ✓                                                                                                                    | Drawer           | ☐      | [P](https://primeng.org/drawer) [D](https://daisyui.com/components/drawer/) [S](https://ui.shadcn.com/docs/components/drawer)                                                     | Side panel                          |
| ✓ duplicate of drawer                                                                                                | Sheet            | ☐      | [S](https://ui.shadcn.com/docs/components/sheet)                                                                                                                                  | shadcn-style side overlay           |
| ✓                                                                                                                    | Bottom Sheet     | ☐      | [M](https://material.angular.dev/components/bottom-sheet)                                                                                                                         | Mobile-style bottom-anchored sheet  |
| ✓                                                                                                                    | Dropdown Menu    | ☐      | [M](https://material.angular.dev/components/menu) [D](https://daisyui.com/components/dropdown/) [S](https://ui.shadcn.com/docs/components/dropdown-menu)                          | Anchored menu from a trigger        |
| ✓                                                                                                                    | Context Menu     | ☐      | [P](https://primeng.org/contextmenu) [S](https://ui.shadcn.com/docs/components/context-menu)                                                                                      | Right-click menu                    |
| ✓                                                                                                                    | Command Palette  | ☐      | [S](https://ui.shadcn.com/docs/components/command)                                                                                                                                | Cmd-K style                         |
|                                                                                                                      | Theme Controller | ☐      | [D](https://daisyui.com/components/theme-controller/)                                                                                                                             | Theme switcher                      |
|                                                                                                                      | Swap             | ☐      | [D](https://daisyui.com/components/swap/)                                                                                                                                         | Two-state icon/label swap           |


## 2. Data Input


| Keep?                           | Component                    | Status | Sources                                                                                                                                                                                       | Notes                                  |
| ------------------------------- | ---------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| ✓                               | Input                        | ✓      | [P](https://primeng.org/inputtext) [M](https://material.angular.dev/components/input) [D](https://daisyui.com/components/text-input/) [S](https://ui.shadcn.com/docs/components/input)        |                                        |
| ✓                               | Textarea                     | ☐      | [P](https://primeng.org/textarea) [D](https://daisyui.com/components/textarea/) [S](https://ui.shadcn.com/docs/components/textarea)                                                           |                                        |
| ✓                               | Number Input                 | ☐      | [P](https://primeng.org/inputnumber)                                                                                                                                                          | Stepped numeric                        |
| ✓                               | Password Input               | ☐      | [P](https://primeng.org/password)                                                                                                                                                             | Strength meter + reveal                |
| ✓                               | Input Mask                   | ☐      | [P](https://primeng.org/inputmask)                                                                                                                                                            | Pattern-masked entry                   |
| ✓                               | Input OTP                    | ☐      | [P](https://primeng.org/inputotp) [S](https://ui.shadcn.com/docs/components/input-otp)                                                                                                        | Code/PIN segments                      |
| ✓                               | Input Group                  | ☐      | [P](https://primeng.org/inputgroup) [S](https://ui.shadcn.com/docs/components/input-group)                                                                                                    | Prefix/suffix slots                    |
|                                 | Icon Field                   | ☐      | [P](https://primeng.org/iconfield)                                                                                                                                                            | Input with icon adornment              |
|                                 | Float Label                  | ☐      | [P](https://primeng.org/floatlabel)                                                                                                                                                           | Floating-label pattern                 |
|                                 | Label                        | ☐      | [D](https://daisyui.com/components/label/) [S](https://ui.shadcn.com/docs/components/label)                                                                                                   | Standalone label primitive             |
| ✓                               | Field / Form Field           | ☐      | [M](https://material.angular.dev/components/form-field) [S](https://ui.shadcn.com/docs/components/field)                                                                                      | label + control + hint + error wrapper |
|                                 | Fieldset                     | ☐      | [P](https://primeng.org/fieldset) [D](https://daisyui.com/components/fieldset/)                                                                                                               | Grouped fields with legend             |
| ✓                               | Form                         | ☐      | [S](https://ui.shadcn.com/docs/components/form)                                                                                                                                               | Validation/binding pattern             |
|                                 | Validator                    | ☐      | [D](https://daisyui.com/components/validator/)                                                                                                                                                | Validator primitive                    |
| ✓                               | Checkbox                     | ◐      | [P](https://primeng.org/checkbox) [M](https://material.angular.dev/components/checkbox) [D](https://daisyui.com/components/checkbox/) [S](https://ui.shadcn.com/docs/components/checkbox)     |                                        |
| ✓                               | Radio                        | ◐      | [P](https://primeng.org/radiobutton) [M](https://material.angular.dev/components/radio) [D](https://daisyui.com/components/radio/) [S](https://ui.shadcn.com/docs/components/radio-group)     |                                        |
| ✓                               | Toggle / Switch              | ◐      | [P](https://primeng.org/toggleswitch) [M](https://material.angular.dev/components/slide-toggle) [D](https://daisyui.com/components/toggle/) [S](https://ui.shadcn.com/docs/components/switch) |                                        |
| ✓                               | Select                       | ◐      | [P](https://primeng.org/select) [M](https://material.angular.dev/components/select) [D](https://daisyui.com/components/select/) [S](https://ui.shadcn.com/docs/components/select)             |                                        |
| ✓                               | Multi Select                 | ☐      | [P](https://primeng.org/multiselect)                                                                                                                                                          | Multi-value select                     |
| ✓                               | Combobox / Autocomplete      | ☐      | [P](https://primeng.org/autocomplete) [M](https://material.angular.dev/components/autocomplete) [S](https://ui.shadcn.com/docs/components/combobox)                                           |                                        |
| ✓                               | Cascade Select               | ☐      | [P](https://primeng.org/cascadeselect)                                                                                                                                                        | Hierarchical select                    |
| ✓                               | Tree Select                  | ☐      | [P](https://primeng.org/treeselect)                                                                                                                                                           | Tree-based select                      |
| duplicate of tabs/Toggle button | Toggle Group / Select Button | ☐      | [P](https://primeng.org/selectbutton) [S](https://ui.shadcn.com/docs/components/toggle-group)                                                                                                 | Segmented multi-press                  |
| ✓                               | Slider / Range               | ☐      | [P](https://primeng.org/slider) [M](https://material.angular.dev/components/slider) [D](https://daisyui.com/components/range/) [S](https://ui.shadcn.com/docs/components/slider)              |                                        |
|                                 | Knob                         | ☐      | [P](https://primeng.org/knob)                                                                                                                                                                 | Rotary numeric input                   |
|                                 | Rating                       | ☐      | [P](https://primeng.org/rating) [D](https://daisyui.com/components/rating/)                                                                                                                   | Stars/score                            |
| ✓                               | File Input / Upload          | ☐      | [P](https://primeng.org/fileupload) [D](https://daisyui.com/components/file-input/)                                                                                                           | Single + multi + drag-drop             |
| ✓                               | Date Picker                  | ☐      | [P](https://primeng.org/datepicker) [M](https://material.angular.dev/components/datepicker) [S](https://ui.shadcn.com/docs/components/date-picker)                                            |                                        |
| ✓                               | Calendar                     | ☐      | [D](https://daisyui.com/components/calendar/) [S](https://ui.shadcn.com/docs/components/calendar)                                                                                             | Standalone inline calendar             |
| ✓                               | Time Picker                  | ☐      | [M](https://material.angular.dev/components/timepicker)                                                                                                                                       |                                        |
| ✓                               | Color Picker                 | ☐      | [P](https://primeng.org/colorpicker)                                                                                                                                                          |                                        |
|                                 | Filter / Search              | ☐      | [D](https://daisyui.com/components/filter/)                                                                                                                                                   | Searchable list filter                 |
| ✓                               | Editor / Rich Text           | ☐      | [P](https://primeng.org/editor)                                                                                                                                                               | WYSIWYG (heavy)                        |
|                                 | Key Filter                   | ☐      | [P](https://primeng.org/keyfilter)                                                                                                                                                            | Allow/deny keystroke pattern           |


## 3. Data Display


| Keep?                               | Component                  | Status | Sources                                                                                                                                                                                       | Notes                               |
| ----------------------------------- | -------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| ✓                                   | Accordion                  | ◐      | [P](https://primeng.org/accordion) [M](https://material.angular.dev/components/expansion) [D](https://daisyui.com/components/accordion/) [S](https://ui.shadcn.com/docs/components/accordion) |                                     |
|                                     | Collapsible                | ☐      | [D](https://daisyui.com/components/collapse/) [S](https://ui.shadcn.com/docs/components/collapsible)                                                                                          | Single-disclosure                   |
| ✓                                   | Avatar                     | ◐      | [P](https://primeng.org/avatar) [D](https://daisyui.com/components/avatar/) [S](https://ui.shadcn.com/docs/components/avatar)                                                                 |                                     |
| ✓                                   | Avatar Group               | ☐      | [P](https://primeng.org/avatargroup)                                                                                                                                                          | Stacked avatars                     |
| ✓                                   | Badge                      | ◐      | [P](https://primeng.org/badge) [M](https://material.angular.dev/components/badge) [D](https://daisyui.com/components/badge/) [S](https://ui.shadcn.com/docs/components/badge)                 |                                     |
| ✓                                   | Overlay Badge              | ☐      | [P](https://primeng.org/overlaybadge)                                                                                                                                                         | Badge-on-element wrapper            |
| ✓                                   | Tag / Chip                 | ☐      | [P](https://primeng.org/tag) [M](https://material.angular.dev/components/chips)                                                                                                               | Pill / removable token              |
| ✓                                   | Card                       | ✓      | [P](https://primeng.org/card) [M](https://material.angular.dev/components/card) [D](https://daisyui.com/components/card/) [S](https://ui.shadcn.com/docs/components/card)                     |                                     |
| ✓                                   | Carousel                   | ☐      | [P](https://primeng.org/carousel) [D](https://daisyui.com/components/carousel/) [S](https://ui.shadcn.com/docs/components/carousel)                                                           |                                     |
| ✓                                   | Chart                      | ☐      | [P](https://primeng.org/chart) [S](https://ui.shadcn.com/docs/components/chart)                                                                                                               |                                     |
| ✓ handled by chart itself           | Chat Bubble                | ☐      | [D](https://daisyui.com/components/chat/)                                                                                                                                                     | Conversation message bubble         |
|                                     | Countdown                  | ☐      | [D](https://daisyui.com/components/countdown/)                                                                                                                                                | Live countdown                      |
|                                     | Diff                       | ☐      | [D](https://daisyui.com/components/diff/)                                                                                                                                                     | Image/text diff viewer              |
|                                     | Hover Card                 | ☐      | [S](https://ui.shadcn.com/docs/components/hover-card)                                                                                                                                         | Hover-triggered preview             |
|                                     | Image                      | ☐      | [P](https://primeng.org/image)                                                                                                                                                                | Loading/preview wrapper             |
|                                     | Image Compare              | ☐      | [P](https://primeng.org/imagecompare)                                                                                                                                                         | Before/after slider                 |
|                                     | Galleria / Gallery         | ☐      | [P](https://primeng.org/galleria) [D](https://daisyui.com/components/hover-gallery/)                                                                                                          | Image gallery                       |
| ✓                                   | Kbd                        | ✓      | [D](https://daisyui.com/components/kbd/) [S](https://ui.shadcn.com/docs/components/kbd)                                                                                                       |                                     |
| ✓                                   | List                       | ☐      | [P](https://primeng.org/orderlist) [M](https://material.angular.dev/components/list) [D](https://daisyui.com/components/list/) [S](https://ui.shadcn.com/docs/components/item)                | Styled / transferable list patterns |
|                                     | Stat                       | ☐      | [D](https://daisyui.com/components/stat/)                                                                                                                                                     | Headline metric                     |
|                                     | Status Indicator           | ☐      | [D](https://daisyui.com/components/status/)                                                                                                                                                   | Online/away/offline dot             |
| ✓                                   | Empty State                | ☐      | [S](https://ui.shadcn.com/docs/components/empty)                                                                                                                                              | Placeholder for no-data             |
| ✓                                   | Typography                 | ☐      | [S](https://ui.shadcn.com/docs/components/typography)                                                                                                                                         | Heading/text primitives             |
| ✓ using tankstack wrapper for table | Table                      | ☐      | [P](https://primeng.org/table) [M](https://material.angular.dev/components/table) [D](https://daisyui.com/components/table/) [S](https://ui.shadcn.com/docs/components/table)                 | Base table styling                  |
| ✓ using tankstack wrapper for table | Data Table                 | ☐      | [P](https://primeng.org/table) [M](https://material.angular.dev/components/sort) [S](https://ui.shadcn.com/docs/components/data-table)                                                        | Sortable/paginated/filterable       |
| ✓ part of the List impl             | Tree                       | ☐      | [P](https://primeng.org/tree) [M](https://material.angular.dev/components/tree)                                                                                                               |                                     |
| ✓ using tankstack wrapper for table | Tree Table                 | ☐      | [P](https://primeng.org/treetable)                                                                                                                                                            | Hierarchical table                  |
|                                     | Timeline                   | ☐      | [P](https://primeng.org/timeline) [D](https://daisyui.com/components/timeline/)                                                                                                               |                                     |
|                                     | Inplace                    | ☐      | [P](https://primeng.org/inplace)                                                                                                                                                              | Click-to-edit display swap          |
|                                     | Order List                 | ☐      | [P](https://primeng.org/orderlist)                                                                                                                                                            | Reorderable list                    |
|                                     | Pick List                  | ☐      | [P](https://primeng.org/picklist)                                                                                                                                                             | Two-pane transfer list              |
|                                     | Organization Chart         | ☐      | [P](https://primeng.org/organizationchart)                                                                                                                                                    | Hierarchical org tree               |
|                                     | Meter Group                | ☐      | [P](https://primeng.org/metergroup)                                                                                                                                                           | Multi-segment meter                 |
|                                     | Scroll Area / Scroll Panel | ☐      | [P](https://primeng.org/scrollpanel) [S](https://ui.shadcn.com/docs/components/scroll-area)                                                                                                   | Custom scrollbar wrapper            |
|                                     | Scroll Top                 | ☐      | [P](https://primeng.org/scrolltop)                                                                                                                                                            | Floating scroll-to-top              |
|                                     | Text Rotate                | ☐      | [D](https://daisyui.com/components/text-rotate/)                                                                                                                                              | Rotating text marquee               |
|                                     | Hover 3D Card              | ☐      | [D](https://daisyui.com/components/hover-3d-card/)                                                                                                                                            | 3D-tilt hover effect                |


## 4. Feedback


| Keep?               | Component       | Status | Sources                                                                                                                                                                                                | Notes                         |
| ------------------- | --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| ✓                   | Toast           | ◐      | [P](https://primeng.org/toast) [M](https://material.angular.dev/components/snack-bar) [D](https://daisyui.com/components/toast/) [S](https://ui.shadcn.com/docs/components/sonner)                     |                               |
| ✓                   | Alert / Banner  | ☐      | [P](https://primeng.org/message) [D](https://daisyui.com/components/alert/) [S](https://ui.shadcn.com/docs/components/alert)                                                                           | Inline persistent message     |
| ✓                   | Tooltip         | ☐      | [P](https://primeng.org/tooltip) [M](https://material.angular.dev/components/tooltip) [D](https://daisyui.com/components/tooltip/) [S](https://ui.shadcn.com/docs/components/tooltip)                  |                               |
| ✓                   | Popover         | ☐      | [P](https://primeng.org/popover) [S](https://ui.shadcn.com/docs/components/popover)                                                                                                                    |                               |
| ✓                   | Progress Bar    | ☐      | [P](https://primeng.org/progressbar) [M](https://material.angular.dev/components/progress-bar) [D](https://daisyui.com/components/progress/) [S](https://ui.shadcn.com/docs/components/progress)       | Linear                        |
| ✓                   | Spinner         | ☐      | [P](https://primeng.org/progressspinner) [M](https://material.angular.dev/components/progress-spinner) [D](https://daisyui.com/components/loading/) [S](https://ui.shadcn.com/docs/components/spinner) | Indeterminate                 |
| ✓ with Progress Bar | Radial Progress | ☐      | [D](https://daisyui.com/components/radial-progress/)                                                                                                                                                   | Circular progress             |
| ✓                   | Skeleton        | ☐      | [P](https://primeng.org/skeleton) [D](https://daisyui.com/components/skeleton/) [S](https://ui.shadcn.com/docs/components/skeleton)                                                                    |                               |
|                     | Block UI        | ☐      | [P](https://primeng.org/blockui)                                                                                                                                                                       | Overlay-while-loading wrapper |


## 5. Navigation


| Keep?                             | Component         | Status | Sources                                                                                                                                                                                         | Notes                               |
| --------------------------------- | ----------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| ✓                                 | Link              | ✓      | [D](https://daisyui.com/components/link/)                                                                                                                                                       | Styled `<a>`                        |
| ✓ isnt it duplicate of dropdown ? | Menu              | ◐      | [P](https://primeng.org/menu) [M](https://material.angular.dev/components/menu) [D](https://daisyui.com/components/menu/)                                                                       | Vertical/horizontal menu list       |
| ✓                                 | Menubar           | ☐      | [P](https://primeng.org/menubar) [S](https://ui.shadcn.com/docs/components/menubar)                                                                                                             | App-bar style menu (File/Edit/View) |
| ✓ all part of the menu            | Megamenu          | ☐      | [P](https://primeng.org/megamenu)                                                                                                                                                               | Multi-column menu                   |
| ✓ all part of the menu            | Panel Menu        | ☐      | [P](https://primeng.org/panelmenu)                                                                                                                                                              | Accordion-menu hybrid               |
| ✓ all part of the menu            | Tiered Menu       | ☐      | [P](https://primeng.org/tieredmenu)                                                                                                                                                             | Multi-level cascade menu            |
| ✓ all part of the menu            | Navigation Menu   | ☐      | [S](https://ui.shadcn.com/docs/components/navigation-menu)                                                                                                                                      | Site-nav with submenus              |
| ✓ all part of the menubar         | Navbar            | ☐      | [D](https://daisyui.com/components/navbar/)                                                                                                                                                     | Top app navbar shell                |
|                                   | Toolbar           | ☐      | [P](https://primeng.org/toolbar) [M](https://material.angular.dev/components/toolbar)                                                                                                           | Action toolbar shell                |
|                                   | Sidebar / Sidenav | ☐      | [M](https://material.angular.dev/components/sidenav) [S](https://ui.shadcn.com/docs/components/sidebar)                                                                                         | Persistent app sidebar              |
|                                   | Dock              | ☐      | [P](https://primeng.org/dock) [D](https://daisyui.com/components/dock/)                                                                                                                         | App-dock launcher                   |
| ✓                                 | Breadcrumb        | ☐      | [P](https://primeng.org/breadcrumb) [D](https://daisyui.com/components/breadcrumbs/) [S](https://ui.shadcn.com/docs/components/breadcrumb)                                                      |                                     |
| ✓                                 | Pagination        | ☐      | [P](https://primeng.org/paginator) [M](https://material.angular.dev/components/paginator) [D](https://daisyui.com/components/pagination/) [S](https://ui.shadcn.com/docs/components/pagination) |                                     |
| ✓ duplicate of Stepper            | Steps             | ☐      | [P](https://primeng.org/steps) [D](https://daisyui.com/components/steps/)                                                                                                                       | Linear step indicator (display)     |
| ✓                                 | Stepper           | ☐      | [P](https://primeng.org/stepper) [M](https://material.angular.dev/components/stepper)                                                                                                           | Multi-step form/wizard              |
| ✓                                 | Tabs              | ◐      | [P](https://primeng.org/tabs) [M](https://material.angular.dev/components/tabs) [D](https://daisyui.com/components/tab/) [S](https://ui.shadcn.com/docs/components/tabs)                        |                                     |


## 6. Layout


| Keep? | Component            | Status | Sources                                                                                                                                                                                 | Notes                         |
| ----- | -------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| ✓     | Divider / Separator  | ☐      | [P](https://primeng.org/divider) [M](https://material.angular.dev/components/divider) [D](https://daisyui.com/components/divider/) [S](https://ui.shadcn.com/docs/components/separator) |                               |
|       | Aspect Ratio         | ☐      | [S](https://ui.shadcn.com/docs/components/aspect-ratio)                                                                                                                                 | Ratio-locked container        |
|       | Grid List            | ☐      | [M](https://material.angular.dev/components/grid-list)                                                                                                                                  | Tile/grid container           |
|       | Splitter / Resizable | ☐      | [P](https://primeng.org/splitter) [S](https://ui.shadcn.com/docs/components/resizable)                                                                                                  | Resizable panes               |
|       | Stack                | ☐      | [D](https://daisyui.com/components/stack/)                                                                                                                                              | Stacked element layout        |
|       | Indicator            | ☐      | [D](https://daisyui.com/components/indicator/)                                                                                                                                          | Corner/edge marker overlay    |
|       | Join                 | ☐      | [D](https://daisyui.com/components/join/)                                                                                                                                               | Visually joined sibling group |
|       | Mask                 | ☐      | [D](https://daisyui.com/components/mask/)                                                                                                                                               | Shape-clipped image           |
|       | Hero                 | ☐      | [D](https://daisyui.com/components/hero/)                                                                                                                                               | Page-hero block               |
|       | Footer               | ☐      | [D](https://daisyui.com/components/footer/)                                                                                                                                             | Page-footer block             |
|       | Panel                | ☐      | [P](https://primeng.org/panel)                                                                                                                                                          | Titled content container      |
|       | Direction (LTR/RTL)  | ☐      | [S](https://ui.shadcn.com/docs/components/direction)                                                                                                                                    | Direction primitive           |


## 7. Mockup


| Keep? | Component      | Status | Sources                                             | Notes |
| ----- | -------------- | ------ | --------------------------------------------------- | ----- |
|       | Browser Mockup | ☐      | [D](https://daisyui.com/components/mockup-browser/) |       |
|       | Code Mockup    | ☐      | [D](https://daisyui.com/components/mockup-code/)    |       |
|       | Phone Mockup   | ☐      | [D](https://daisyui.com/components/mockup-phone/)   |       |
|       | Window Mockup  | ☐      | [D](https://daisyui.com/components/mockup-window/)  |       |


---

## Totals


| Category     | Existing (✓ + ◐) | Gaps (☐) | Total   |
| ------------ | ---------------- | -------- | ------- |
| Actions      | 1                | 15       | 16      |
| Data input   | 4                | 30       | 34      |
| Data display | 5                | 31       | 36      |
| Feedback     | 1                | 8        | 9       |
| Navigation   | 3                | 13       | 16      |
| Layout       | 0                | 12       | 12      |
| Mockup       | 0                | 4        | 4       |
| **Total**    | **14**           | **113**  | **127** |


> 14 line-items map to 16 existing kouji folders because Radio / Tabs / Menu collapse compound directives into one row.

---









