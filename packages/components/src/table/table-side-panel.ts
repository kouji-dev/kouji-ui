import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Column } from '@tanstack/angular-table';
import {
  DRAWER_DATA,
  KJ_TABLE,
  KjDrawer,
  KjDrawerRef,
  KjDrawerService,
  KjTable,
} from '@kouji-ui/core';

/**
 * Data injected into the side-panel content component via `DRAWER_DATA`.
 * Carries the parent `KjTable` instance (the side-panel is opened by a service
 * call so the content sees an injector that doesn't include the parent
 * `<table>`'s `KJ_TABLE` provider — we relay it explicitly here) plus the
 * header title resolved from the controller's `kjTitle` input.
 */
interface SidePanelData {
  readonly table: KjTable<unknown>;
  readonly title: string;
}

/**
 * Content of the column tool panel. Rendered inside `<kj-drawer>` by the
 * service-launched drawer. Receives the parent `KjTable` instance through
 * {@link DRAWER_DATA} (rather than via the standard `KJ_TABLE` token) because
 * the drawer's injector chain doesn't traverse the host component tree —
 * see `KjDrawerService.open` which creates the overlay under the environment
 * injector and re-provides only the drawer-scoped tokens.
 *
 * @internal
 */
@Component({
  selector: 'kj-table-side-panel-content',
  standalone: true,
  imports: [KjDrawer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <kj-drawer>
      <header class="kj-drawer-header">
        <h2 class="kj-drawer-title">{{ data.title }}</h2>
      </header>
      <div class="kj-drawer-body" data-padded data-scroll>
        @for (col of leafColumns(); track col.id) {
          <div
            class="kj-table-side-panel-row"
            [attr.aria-label]="'Column: ' + columnLabel(col)"
          >
            <label class="kj-table-side-panel-vis">
              <input
                type="checkbox"
                [checked]="col.getIsVisible()"
                (change)="onToggleVisible(col)"
                [attr.aria-label]="'Show column ' + columnLabel(col)"
              />
              <span>{{ columnLabel(col) }}</span>
            </label>
            <div class="kj-table-side-panel-actions" role="group"
                 [attr.aria-label]="'Pin and group ' + columnLabel(col)">
              <button
                type="button"
                [attr.aria-pressed]="pinOf(col.id) === 'left'"
                (click)="onPin(col.id, 'left')"
                data-action="pin-left"
              >Pin left</button>
              <button
                type="button"
                [attr.aria-pressed]="pinOf(col.id) === false"
                (click)="onPin(col.id, false)"
                data-action="pin-none"
              >Unpin</button>
              <button
                type="button"
                [attr.aria-pressed]="pinOf(col.id) === 'right'"
                (click)="onPin(col.id, 'right')"
                data-action="pin-right"
              >Pin right</button>
              <button
                type="button"
                [attr.aria-pressed]="isGrouped(col.id)"
                (click)="onToggleGroup(col.id)"
                data-action="group"
              >Group by</button>
            </div>
          </div>
        }
      </div>
    </kj-drawer>
  `,
  styles: [`
    @layer kj.component {
      .kj-table-side-panel-row {
        display: flex;
        align-items: center;
        gap: var(--kj-space-md);
        padding: var(--kj-space-xs) 0;
      }
      .kj-table-side-panel-vis {
        display: inline-flex;
        align-items: center;
        gap: var(--kj-space-xs);
        flex: 1;
      }
      .kj-table-side-panel-actions {
        display: inline-flex;
        gap: var(--kj-space-xs);
      }
      .kj-table-side-panel-actions button {
        min-height: 44px;
        min-width: 44px;
        padding: var(--kj-space-xs) var(--kj-space-sm);
      }
    }
  `],
  host: {
    '[attr.aria-label]': 'data.title',
  },
})
export class KjTableSidePanelContent {
  protected readonly data = inject<SidePanelData>(DRAWER_DATA);

  /** All non-grouping leaf columns of the parent table. */
  protected readonly leafColumns = computed(() => {
    // Touch state signals so the computed re-runs when columns are hidden,
    // pinned, or grouped (TanStack's `getAllLeafColumns()` returns a fresh
    // view on each pass).
    this.data.table.state.columnVisibility();
    this.data.table.state.columnPinning();
    this.data.table.state.grouping();
    return this.data.table.table().getAllLeafColumns();
  });

  protected columnLabel(col: Column<unknown, unknown>): string {
    const h = col.columnDef.header;
    return typeof h === 'string' ? h : col.id;
  }

  protected pinOf(id: string): 'left' | 'right' | false {
    const p = this.data.table.state.columnPinning();
    if ((p.left ?? []).includes(id)) return 'left';
    if ((p.right ?? []).includes(id)) return 'right';
    return false;
  }

  protected isGrouped(id: string): boolean {
    return this.data.table.state.grouping().includes(id);
  }

  protected onToggleVisible(col: Column<unknown, unknown>): void {
    col.toggleVisibility();
  }

  protected onPin(id: string, side: 'left' | 'right' | false): void {
    const current = this.data.table.state.columnPinning();
    const left  = (current.left  ?? []).filter(c => c !== id);
    const right = (current.right ?? []).filter(c => c !== id);
    if (side === 'left')  left.push(id);
    if (side === 'right') right.push(id);
    this.data.table.setState({ columnPinning: { left, right } });
  }

  protected onToggleGroup(id: string): void {
    const current = this.data.table.state.grouping();
    const next = current.includes(id)
      ? current.filter(c => c !== id)
      : [...current, id];
    this.data.table.setState({ grouping: next });
  }
}

/**
 * Column tool panel controller for `<kj-table>`. Two-way bound to
 * `kjOpen`; opens / closes a service-launched `kj-drawer` whose content lists
 * every leaf column with controls for visibility, pin position, and grouping.
 * The controller itself renders nothing — the drawer is portaled into the
 * shared overlay container so it gets focus trap, Escape handling, and
 * backdrop semantics for free.
 *
 * @example
 * ```html
 * <kj-table [kjData]="rows" [kjColumns]="cols">
 *   <kj-table-side-panel [(kjOpen)]="open" />
 * </kj-table>
 * ```
 *
 * @doc-category Components/Data
 * @doc
 * @doc-name table-side-panel
 * @doc-description Service-launched drawer listing every column with visibility, pin, and group controls.
 */
@Component({
  selector: 'kj-table-side-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  template: ``,
})
export class KjTableSidePanelComponent {
  /** Whether the side panel is visible. Two-way bindable. */
  readonly kjOpen = model(false);
  /** Drawer header text. */
  readonly kjTitle = input('Columns');

  private readonly tbl = inject<KjTable<unknown>>(KJ_TABLE);
  private readonly drawer = inject(KjDrawerService);
  private readonly destroyRef = inject(DestroyRef);
  private ref: KjDrawerRef<KjTableSidePanelContent> | null = null;

  constructor() {
    // Open / close the drawer in response to `kjOpen` changes. Untrack the
    // title so re-typing it doesn't re-open the drawer; the title is read at
    // open-time and projected into the content via `DRAWER_DATA`.
    effect(() => {
      const open = this.kjOpen();
      // The drawer service registers its own root effect to react to overlay
      // state — nesting effects throws NG0602. Wrap the side-effecting calls
      // in `untracked` so opening/closing the drawer doesn't run inside our
      // reactive context.
      untracked(() => {
        if (open && !this.ref) {
          this.openDrawer();
        } else if (!open && this.ref) {
          this.ref.close();
          this.ref = null;
        }
      });
    });
  }

  private openDrawer(): void {
    const data: SidePanelData = { table: this.tbl, title: this.kjTitle() };
    const ref = this.drawer.open<KjTableSidePanelContent, unknown, SidePanelData>(
      KjTableSidePanelContent,
      { side: 'right', data },
    );
    this.ref = ref;
    // Sync the two-way binding back when the drawer dismisses itself
    // (Escape, backdrop click, or programmatic close from inside the panel).
    ref.afterClosed$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.ref === ref) {
          this.ref = null;
          if (this.kjOpen()) this.kjOpen.set(false);
        }
      });
  }
}
