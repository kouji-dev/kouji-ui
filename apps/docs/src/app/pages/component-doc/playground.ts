import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  ViewContainerRef,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  KjButtonComponent,
  KjInputComponent,
  KjNumberInputComponent,
  KjToggleComponent,
} from '@kouji-ui/components';
import { KjIconDirective } from '@kouji-ui/core';
import { ClipboardService } from '../../services/clipboard.service';
import { PLAYGROUND_FILES } from './playground-files';
import type { ControlSpec, PlaygroundFile } from './playground-types';

/**
 * Interactive Playground rendered inside the Overview tab.
 *
 * Each component owns a `<comp>.playground.ts` file (co-located in
 * `packages/components/src/<comp>/`) exporting a `PlaygroundFile`. The
 * playground engine:
 *
 *   • mounts `PlaygroundFile.component` in the stage (a standalone demo
 *     whose template reads from the same writable signals the engine
 *     mutates from the right panel),
 *   • renders one control row per `PlaygroundFile.controls[]` entry,
 *   • on every interaction writes `state[ctrl.name].set(value)` → the demo
 *     re-renders via signal reactivity AND the engine recomputes
 *     `snippet(currentValues)` for the code block.
 *
 * Pages with no entry in `PLAYGROUND_FILES` render the static "not yet
 * wired" placeholder.
 */
@Component({
  selector: 'app-playground',
  standalone: true,
  imports: [
    FormsModule,
    KjButtonComponent,
    KjIconDirective,
    KjInputComponent,
    KjNumberInputComponent,
    KjToggleComponent,
  ],
  templateUrl: './playground.html',
  styleUrl: './playground.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-playground' },
})
export class PlaygroundComponent {
  /** Symbol name from `DocItem.symbol` (e.g. `KjButtonComponent`). */
  readonly symbol = input.required<string>();

  private readonly clipboard = inject(ClipboardService);
  private readonly stage = viewChild<string, ViewContainerRef>('stage', { read: ViewContainerRef });

  /** Look up the playground file, or null if the symbol isn't wired yet. */
  protected readonly playgroundFile = computed<PlaygroundFile | null>(
    () => PLAYGROUND_FILES[this.symbol()] ?? null,
  );

  /**
   * Generated template snippet, recomputed on every state change. Reads each
   * control's signal so Angular's reactivity tracks them, then forwards the
   * current values to the entry's `snippet` fn.
   */
  protected readonly snippet = computed<string>(() => {
    const pf = this.playgroundFile();
    if (!pf) return '';
    const values: Record<string, unknown> = {};
    for (const ctrl of pf.controls) {
      const sig = pf.state[ctrl.name];
      values[ctrl.name] = sig?.();
    }
    return pf.snippet(values);
  });

  /** Whether the "copied!" affordance is currently visible. */
  protected readonly copied = signal(false);

  private readonly liveRef = signal<ComponentRef<unknown> | null>(null);

  constructor() {
    // Mount / unmount the live component when an entry + stage become
    // available. The demo owns its template; we just instantiate it and let
    // it bind to the shared state signals via its own template.
    effect(() => {
      const vcr = this.stage();
      const pf = this.playgroundFile();
      if (!vcr) return;
      const prev = untracked(() => this.liveRef());
      if (prev) {
        prev.destroy();
        this.liveRef.set(null);
      }
      vcr.clear();
      if (!pf) return;
      const ref = vcr.createComponent(pf.component);
      this.liveRef.set(ref);
    });
  }

  /** Get the current value of a control's bound signal. */
  protected getValue(name: string): unknown {
    return this.playgroundFile()?.state[name]?.();
  }

  protected setChip(ctrl: ControlSpec & { kind: 'chips' }, value: string | number): void {
    this.playgroundFile()?.state[ctrl.name]?.set(value);
  }

  protected toggle(ctrl: ControlSpec & { kind: 'toggle' }): void {
    const sig = this.playgroundFile()?.state[ctrl.name] as WritableSignal<boolean> | undefined;
    sig?.update((v) => !v);
  }

  protected setText(ctrl: ControlSpec & { kind: 'text' }, value: string): void {
    this.playgroundFile()?.state[ctrl.name]?.set(value);
  }

  protected setNumber(ctrl: ControlSpec & { kind: 'number' }, value: number): void {
    this.playgroundFile()?.state[ctrl.name]?.set(value);
  }

  protected chipPressed(ctrl: ControlSpec & { kind: 'chips' }, value: string | number): boolean {
    return this.getValue(ctrl.name) === value;
  }

  protected toggleOn(ctrl: ControlSpec & { kind: 'toggle' }): boolean {
    return this.getValue(ctrl.name) === true;
  }

  /** Copy the generated snippet to the clipboard. */
  protected async copy(): Promise<void> {
    const ok = await this.clipboard.copy(this.snippet());
    if (!ok) return;
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1600);
  }
}
