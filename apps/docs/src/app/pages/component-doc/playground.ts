import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ClipboardService } from '../../services/clipboard.service';
import {
  ControlSpec,
  PLAYGROUND_REGISTRY,
  PlaygroundEntry,
  generatePlaygroundTemplate,
} from './playground-registry';

/**
 * Interactive Playground rendered inside the Overview tab.
 *
 * Layout (mirrors `design-revamp/docs.jsx PlaygroundSection`):
 *
 *   ┌───────────────────────────┬─────────────────────┐
 *   │   live component stage    │    chip controls    │
 *   │                           │  (one row per input)│
 *   └───────────────────────────┴─────────────────────┘
 *   <generated template code-block with copy button>
 *
 * The live component is created via `ViewContainerRef.createComponent` and its
 * inputs are written through `ComponentRef.setInput`, so every chip / toggle
 * change is reflected on the next change-detection tick. The default slot is
 * a `document.createTextNode` projected into the component's `<ng-content>`
 * and rewritten in place (no recreation) when the label changes.
 *
 * Pages whose symbol isn't in {@link PLAYGROUND_REGISTRY} render a static
 * placeholder; per-component registry entries are added incrementally.
 */
@Component({
  selector: 'app-playground',
  standalone: true,
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

  /** Look up the registry entry, or null if the symbol isn't wired yet. */
  protected readonly entry = computed<PlaygroundEntry | null>(
    () => PLAYGROUND_REGISTRY[this.symbol()] ?? null,
  );

  /** Current value of every control, keyed by `ControlSpec.input`. */
  protected readonly values = signal<Record<string, unknown>>({});

  /** True when no playground is wired for the current symbol. */
  protected readonly noEntry = computed(() => this.entry() === null);

  /** Generated template snippet, recomputed on every control change. */
  protected readonly snippet = computed<string>(() => {
    const e = this.entry();
    if (!e) return '';
    return generatePlaygroundTemplate(e, this.values());
  });

  /** Whether the "copied!" affordance is currently visible. */
  protected readonly copied = signal(false);

  private readonly liveRef = signal<ComponentRef<unknown> | null>(null);
  private slotNode: Text | null = null;

  constructor() {
    // Re-seed defaults whenever the page entry flips. `untracked` keeps the
    // `values` write out of the dependency graph (otherwise the effect would
    // self-trigger).
    effect(() => {
      this.entry(); // read for dependency
      untracked(() => this.seedDefaults());
    });

    // Mount / unmount the live component when entry + stage become available.
    effect(() => {
      const vcr = this.stage();
      const e = this.entry();
      if (!vcr) return;
      const prev = untracked(() => this.liveRef());
      if (prev) {
        prev.destroy();
        this.slotNode = null;
        this.liveRef.set(null);
      }
      vcr.clear();
      if (!e) return;
      this.slotNode = typeof document !== 'undefined' ? document.createTextNode('') : null;
      const projectable: Node[][] = this.slotNode ? [[this.slotNode]] : [[]];
      const ref = vcr.createComponent(e.component, { projectableNodes: projectable });
      this.liveRef.set(ref);
    });

    // Push input + slot updates into the live instance every time `values`
    // (or liveRef) changes — promoting liveRef to a signal ensures the very
    // first values flush hits a freshly mounted component instance.
    effect(() => {
      const v = this.values();
      const e = this.entry();
      const ref = this.liveRef();
      if (!ref || !e) return;
      for (const c of e.controls) {
        if (c.kind === 'text' && c.input === '__slot__') {
          if (this.slotNode) this.slotNode.nodeValue = (v['__slot__'] as string) ?? c.default;
          continue;
        }
        const val = v[c.input] ?? c.default;
        try {
          ref.setInput(c.input, val);
        } catch {
          // Input not declared on this component — silently skip.
        }
      }
      ref.changeDetectorRef.markForCheck();
    });
  }

  /** Re-seed defaults — invoked on symbol change. */
  private seedDefaults(): void {
    const e = this.entry();
    if (!e) {
      this.values.set({});
      return;
    }
    const seeded: Record<string, unknown> = {};
    for (const c of e.controls) {
      if (c.kind === 'text') seeded['__slot__'] = c.default;
      else seeded[c.input] = c.default;
    }
    this.values.set(seeded);
  }

  /**
   * Sets the value for a control. `chips` writes the option string; `toggle`
   * flips the boolean; `text` updates the slot.
   */
  protected setChip(ctrl: ControlSpec & { kind: 'chips' }, value: string): void {
    this.values.update((v) => ({ ...v, [ctrl.input]: value }));
  }
  protected toggle(ctrl: ControlSpec & { kind: 'toggle' }): void {
    this.values.update((v) => ({ ...v, [ctrl.input]: !v[ctrl.input] }));
  }
  protected setText(value: string): void {
    this.values.update((v) => ({ ...v, ['__slot__']: value }));
  }

  /** Whether a chip's value matches the current control state. */
  protected chipPressed(ctrl: ControlSpec & { kind: 'chips' }, value: string): boolean {
    return this.values()[ctrl.input] === value;
  }

  /** True when a toggle control's value is `true`. */
  protected isOn(ctrl: ControlSpec & { kind: 'toggle' }): boolean {
    return this.values()[ctrl.input] === true;
  }

  /** Current label / slot text (for `[value]` on the text input). */
  protected textValue(): string {
    return (this.values()['__slot__'] as string) ?? '';
  }

  /** Copy the generated template snippet to the clipboard. */
  protected async copy(): Promise<void> {
    const ok = await this.clipboard.copy(this.snippet());
    if (!ok) return;
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1600);
  }
}
