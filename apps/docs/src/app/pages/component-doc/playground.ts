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
import { KjIcon } from '@kouji-ui/core';
import { ClipboardService } from '../../services/clipboard.service';
import { PlaygroundRegistryService } from './playground-registry';
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
 * Pages with no entry in `PLAYGROUND_LOADERS` render the static "not yet
 * wired" placeholder.
 *
 * The entry itself arrives asynchronously: `PlaygroundRegistryService` loads
 * one chunk per playground (see `playground-files/index.ts` for why a static
 * registry could not be code-split) and blocks application stability while it
 * does, so the prerender renders a *real* component into the stage instead of
 * finishing first and emitting an empty one.
 */
@Component({
  selector: 'app-playground',
  standalone: true,
  imports: [
    FormsModule,
    KjButtonComponent,
    KjIcon,
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
  private readonly registry = inject(PlaygroundRegistryService);
  private readonly stage = viewChild<string, ViewContainerRef>('stage', { read: ViewContainerRef });

  /**
   * Resolved playground file for the current symbol — `null` while its chunk
   * is in flight, and for any symbol with no playground at all. The template
   * shows the "not yet wired" placeholder for both, which is correct: a
   * loading stage and a missing stage look the same and last a frame.
   */
  private readonly resolved = signal<PlaygroundFile | null>(null);

  /** Look up the playground file, or null if the symbol isn't wired yet. */
  protected readonly playgroundFile = this.resolved.asReadonly();

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
    // Resolve the playground chunk whenever the symbol changes. `get()` is
    // memoised per symbol and blocks stability, so this is safe to re-enter
    // and the prerender waits for it. A late answer for a symbol the reader
    // has already navigated away from is dropped.
    effect(() => {
      const symbol = this.symbol();
      untracked(() => this.resolved.set(null));
      void this.registry.get(symbol).then((pf) => {
        if (untracked(() => this.symbol()) !== symbol) return;
        this.resolved.set(pf);
      });
    });

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
    const ok = await this.clipboard.copy(this.snippet(), {
      event: 'copy_code',
      params: { doc_slug: this.symbol(), file_name: 'playground' },
    });
    if (!ok) return;
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1600);
  }
}
