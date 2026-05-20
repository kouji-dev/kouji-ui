import {
  DestroyRef,
  Directive,
  EnvironmentInjector,
  Injector,
  Type,
  ViewContainerRef,
  effect,
  inject,
  input,
  output,
  untracked,
  type ComponentRef,
} from '@angular/core';
import { KJ_EDITOR_CONTRACT, type KjEditorContract } from './table-editors';

/**
 * Structural outlet that mounts a cell editor component into its own
 * `ViewContainerRef`. Replaces the old anchor-`<span>` + `querySelectorAll`
 * sync loop: Angular's view lifecycle now owns mount and tear-down, so when
 * the host `@if` removes the directive the editor is destroyed automatically.
 *
 * Place inside the cell's edit branch:
 *
 * ```html
 * @if (isEditing(c)) {
 *   <ng-container
 *     kjCellEditorOutlet
 *     [kjEditor]="editorTypeFor(c)"
 *     [kjValue]="c.getValue()"
 *     (commit)="onEditCommit(c, $event)"
 *     (cancel)="onEditCancel()"
 *   />
 * }
 * ```
 *
 * The directive wires `KJ_EDITOR_CONTRACT` so each editor sees the same
 * `{ value, commit, cancel }` shape it does today — no editor changes needed.
 */
@Directive({
  selector: '[kjCellEditorOutlet]',
  standalone: true,
})
export class KjCellEditorOutlet {
  /** Editor component class to mount. `null` mounts nothing. */
  readonly kjEditor = input<Type<unknown> | null>(null);

  /** Initial value seeded into the editor's `KJ_EDITOR_CONTRACT`. */
  readonly kjValue = input<unknown>(undefined);

  /** Extra column meta forwarded to the editor through the contract —
   *  used to hand off things like select options without binding inputs
   *  on a dynamically-created component. */
  readonly kjMeta = input<Record<string, unknown> | undefined>(undefined);

  /** Fired when the editor calls `contract.commit(next)`. */
  readonly commit = output<unknown>();

  /** Fired when the editor calls `contract.cancel()`. */
  readonly cancel = output<void>();

  private readonly vcr = inject(ViewContainerRef);
  private readonly envInjector = inject(EnvironmentInjector);
  private readonly parentInjector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  private ref: ComponentRef<unknown> | null = null;

  constructor() {
    // Re-mount whenever the editor type changes. The initial value is
    // captured non-reactively — we don't want every keystroke in the editor
    // to re-seed it. Commit/cancel callbacks read the latest outputs at
    // emit time, so they always wire through to the live component instance.
    effect(() => {
      const editor = this.kjEditor();
      this.tearDown();
      if (!editor) return;

      const initialValue = untracked(() => this.kjValue());
      const meta = untracked(() => this.kjMeta());
      const contract: KjEditorContract<unknown> = {
        value: initialValue,
        commit: (next: unknown) => this.commit.emit(next),
        cancel: () => this.cancel.emit(),
        meta,
      };
      const childInjector = Injector.create({
        providers: [{ provide: KJ_EDITOR_CONTRACT, useValue: contract }],
        parent: this.parentInjector,
      });
      this.ref = this.vcr.createComponent(editor, {
        environmentInjector: this.envInjector,
        injector: childInjector,
      });
      // Force the editor's view to materialize NOW so its child
      // components (and their constructors — KjSelectTrigger registers
      // itself with KjSelect at construction time) run synchronously.
      // Without this, an effect-based focus call could fire before the
      // trigger directive existed.
      this.ref.changeDetectorRef.detectChanges();
    });

    this.destroyRef.onDestroy(() => this.tearDown());
  }

  private tearDown(): void {
    this.ref?.destroy();
    this.ref = null;
    this.vcr.clear();
  }
}
