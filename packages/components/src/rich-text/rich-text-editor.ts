import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  Injector,
  ViewEncapsulation,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  KjIconDirective,
  KjLiveRegion,
  KjRichTextEditor,
  KjRovingTabindex,
  KjRovingTabindexItemDirective,
  KJ_RTE_OVERLAY_DATA,
  type KjActiveOverlay,
  type KjRichTextFeature,
  type KjRteToolbarItem,
} from '@kouji-ui/core';
import { defaultFeatures } from './features/default-features';

let kjRteUid = 0;

/**
 * Styled, accessible rich-text editor composing the headless
 * {@link KjRichTextEditor} core directive with a **dynamic** `role="toolbar"`
 * that renders whatever the active features contribute (sorted by group then
 * order) — no hardcoded buttons. Feature overlays (link/image editors) render in
 * an accessible `role="dialog"` popover.
 *
 * Zero-config gives the full editor via {@link defaultFeatures}; pass a subset to
 * `kjFeatures` (or `provideKjRichText(...)`) to load only the packages you need.
 *
 * @example
 * ```html
 * <kj-rich-text-editor kjLabel="Message" [(kjValue)]="html" />
 * <kj-rich-text-editor [kjFeatures]="[bold(), italic(), link()]" />
 * ```
 * @doc-category Library/Forms
 * @doc
 * @doc-name rich-text-editor
 * @doc-is-main
 * @doc-description Accessible, feature-composed rich-text editor wrapping Lexical with a dynamic toolbar.
 * @doc-example Default [full]
 *   The full editor: the toolbar renders every default feature's contribution.
 *   @doc-file rich-text-editor.example.ts
 * @doc-example Minimal (subset of features) [full]
 *   Only bold, italic and link — the toolbar and loaded packages shrink to match.
 *   @doc-file rich-text-editor.minimal.example.ts
 * @doc-example Custom feature [full]
 *   A feature contributing its own toolbar button + node in a few lines.
 *   @doc-file rich-text-editor.custom-node.example.ts
 * @doc-example Readonly [full]
 *   Renders existing content without editing affordances.
 *   @doc-file rich-text-editor.readonly.example.ts
 * @doc-aria role="textbox" — the editable surface, with aria-multiline="true".
 * @doc-aria role="toolbar" — the formatting controls, arrow-key navigable.
 * @doc-a11y Toggle items expose aria-pressed; feature actions announce via an aria-live region.
 * @doc-css-var --kj-rte-bg — Editor background.
 * @doc-css-var --kj-rte-border-color — Border colour.
 * @doc-css-var --kj-rte-radius — Corner radius.
 * @doc-css-var --kj-rte-min-height — Minimum height of the editable area.
 * @doc-related input,form,field
 */
@Component({
  selector: 'kj-rich-text-editor',
  standalone: true,
  imports: [
    KjRichTextEditor,
    KjRovingTabindex,
    KjRovingTabindexItemDirective,
    KjLiveRegion,
    KjIconDirective,
    NgComponentOutlet,
  ],
  host: { class: 'kj-rte' },
  template: `
    @if (kjShowToolbar()) {
      <div
        class="kj-rte__toolbar"
        role="toolbar"
        [attr.aria-label]="kjToolbarLabel()"
        [attr.aria-controls]="contentId"
        kjRovingTabindex
        kjRovingOrientation="horizontal"
      >
        @for (grp of ed.toolbarGroups(); track grp.group; let firstGroup = $first) {
          @if (!firstGroup) {
            <span class="kj-rte__sep" role="separator" aria-orientation="vertical"></span>
          }
          <div class="kj-rte__group" role="group" [attr.aria-label]="grp.group">
            @for (item of grp.items; track item.id) {
              <button
                type="button"
                class="kj-rte__btn"
                kjRovingTabindexItem
                [attr.aria-label]="item.label"
                [title]="item.label"
                [attr.aria-keyshortcuts]="item.ariaKeyshortcuts || null"
                [class.kj-rte__btn--active]="ed.itemActive(item)"
                [attr.aria-pressed]="item.kind === 'toggle' ? ed.itemActive(item) : null"
                [disabled]="ed.itemDisabled(item)"
                (mousedown)="$event.preventDefault()"
                (click)="onRun(ed, item)"
              >
                <i [kjIcon]="item.icon" aria-hidden="true"></i>
              </button>
            }
          </div>
        }
      </div>

      @if (ed.activeOverlay(); as ov) {
        <div class="kj-rte__overlay" role="dialog" [attr.aria-label]="ov.overlay.label">
          <ng-container
            *ngComponentOutlet="ov.overlay.component; injector: overlayInjector(ov)"
          />
        </div>
      }
    }

    <div
      #ed="kjRichTextEditor"
      [id]="contentId"
      class="kj-rte__content"
      kjRichTextEditor
      [kjFeatures]="kjFeatures()"
      [kjValue]="kjValue()"
      [kjReadonly]="kjReadonly()"
      [attr.aria-label]="kjLabelledBy() ? null : kjLabel()"
      [attr.aria-labelledby]="kjLabelledBy() || null"
      [attr.data-placeholder]="kjPlaceholder() || null"
      (valueChange)="valueChange.emit($event)"
      (textChange)="textChange.emit($event)"
      (jsonChange)="jsonChange.emit($event)"
      (announce)="announce($event)"
    ></div>

    <div class="kj-rte__sr" kjLiveRegion aria-live="polite"></div>
  `,
  styleUrl: './rich-text-editor.css',
  // Editor content is rendered by Lexical (outside Angular), so it cannot carry
  // emulated-encapsulation scoping attributes. Styles are namespaced under
  // `.kj-rte` to stay contained. (Same rationale as the chart component.)
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRichTextEditorComponent {
  private readonly env = inject(EnvironmentInjector);

  /** Active features. Defaults to the full {@link defaultFeatures} bundle. */
  readonly kjFeatures = input<readonly KjRichTextFeature[]>(defaultFeatures());
  /** Initial HTML content. */
  readonly kjValue = input<string>('');
  /** Accessible label for the editable region (ignored when `kjLabelledBy` is set). */
  readonly kjLabel = input<string>('Rich text editor');
  /** ID of an external element that labels the editable region. */
  readonly kjLabelledBy = input<string>('');
  /** Placeholder shown while the editor is empty. */
  readonly kjPlaceholder = input<string>('');
  /** Render read-only (non-editable) content. */
  readonly kjReadonly = input<boolean>(false);
  /** Accessible label for the toolbar. */
  readonly kjToolbarLabel = input<string>('Formatting');
  /** Whether the formatting toolbar is shown. */
  readonly kjShowToolbar = input<boolean>(true);

  /** Emits the serialized HTML whenever the content changes. */
  readonly valueChange = output<string>();
  /** Emits the plain text whenever the content changes. */
  readonly textChange = output<string>();
  /** Emits the Lexical serialized state whenever the content changes. */
  readonly jsonChange = output<unknown>();

  /** @internal Stable id used for aria-controls / labelledby wiring. */
  protected readonly contentId = `kj-rte-${kjRteUid++}`;

  private readonly live = viewChild(KjLiveRegion);
  private readonly overlayInjectors = new WeakMap<object, Injector>();

  /** Run a toolbar item and announce toggle state changes to AT. */
  protected onRun(ed: KjRichTextEditor, item: KjRteToolbarItem): void {
    ed.runItem(item);
    if (item.kind === 'toggle') {
      this.announce(`${item.label} ${ed.itemActive(item) ? 'on' : 'off'}`);
    }
  }

  /** Announce a message via the live region (also handles feature announcements). */
  protected announce(message: string): void {
    this.live()?.announce(message);
  }

  /** Injector that exposes the overlay's data via KJ_RTE_OVERLAY_DATA. */
  protected overlayInjector(active: KjActiveOverlay): Injector {
    const key = (active.data ?? active) as object;
    let injector = this.overlayInjectors.get(key);
    if (!injector) {
      injector = Injector.create({
        parent: this.env,
        providers: [{ provide: KJ_RTE_OVERLAY_DATA, useValue: active.data }],
      });
      this.overlayInjectors.set(key, injector);
    }
    return injector;
  }
}
