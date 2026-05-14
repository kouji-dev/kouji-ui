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
import { KjToggleComponent } from '@kouji-ui/components';
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
  imports: [KjToggleComponent],
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
  private iconNode: SVGSVGElement | null = null;
  private slotHolder: HTMLSpanElement | null = null;

  /**
   * Inline settings-gear SVG matching `button.icon.example.ts` — projected
   * into kj-button when `kjSize === 'icon'` so the icon-only variant renders
   * a real icon instead of overflowing text.
   */
  private static readonly ICON_SVG_PATH =
    'M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.39 1.04.71 1.62.94l.36 2.54c.04.24.25.42.49.42h3.8a.5.5 0 0 0 .49-.42l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z';

  /** True when the current values resolve `kjSize` to `icon`. */
  protected readonly iconMode = computed<boolean>(() => {
    const v = this.values()['kjSize'];
    if (typeof v === 'string') return v === 'icon';
    const e = this.entry();
    const ctrl = e?.controls.find((c) => c.kind === 'chips' && c.input === 'kjSize');
    return ctrl && ctrl.kind === 'chips' ? ctrl.default === 'icon' : false;
  });

  constructor() {
    // Re-seed defaults whenever the page entry flips. `untracked` keeps the
    // `values` write out of the dependency graph (otherwise the effect would
    // self-trigger).
    effect(() => {
      this.entry(); // read for dependency
      untracked(() => this.seedDefaults());
    });

    // Mount / unmount the live component when entry + stage become available.
    // We project a single `<span>` slot-holder and swap its child between a
    // text node (default) and an inline SVG (icon mode) at runtime — keeps
    // the ComponentRef stable while we hot-swap projected content.
    effect(() => {
      const vcr = this.stage();
      const e = this.entry();
      if (!vcr) return;
      const prev = untracked(() => this.liveRef());
      if (prev) {
        prev.destroy();
        this.slotNode = null;
        this.iconNode = null;
        this.slotHolder = null;
        this.liveRef.set(null);
      }
      vcr.clear();
      if (!e) return;
      if (typeof document !== 'undefined') {
        this.slotNode = document.createTextNode('');
        this.slotHolder = document.createElement('span');
        this.slotHolder.style.display = 'contents';
        this.slotHolder.appendChild(this.slotNode);
      }
      const projectable: Node[][] = this.slotHolder ? [[this.slotHolder]] : [[]];
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
      const useIcon = this.iconMode();
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
      // Swap projected content: text node (default) ↔ inline SVG (icon mode).
      this.applyProjectedSlot(useIcon);
      // Icon-only buttons require an aria-label — kj-button warns in dev otherwise.
      if (useIcon) {
        try { ref.setInput('kjAriaLabel', 'Icon button'); } catch { /* not exposed on this component */ }
      } else {
        try { ref.setInput('kjAriaLabel', undefined); } catch { /* ignore */ }
      }
      ref.changeDetectorRef.markForCheck();
    });
  }

  /**
   * Swap the projected slot child between the text node (default) and the
   * inline SVG (icon mode). We keep both nodes in fields so the swap is a
   * cheap `replaceChild` rather than recreating the whole ComponentRef.
   */
  private applyProjectedSlot(useIcon: boolean): void {
    if (!this.slotHolder || typeof document === 'undefined') return;
    if (useIcon) {
      if (!this.iconNode) this.iconNode = this.buildIconNode();
      if (this.slotHolder.firstChild !== this.iconNode) {
        this.slotHolder.replaceChildren(this.iconNode);
      }
    } else {
      if (!this.slotNode) this.slotNode = document.createTextNode('');
      if (this.slotHolder.firstChild !== this.slotNode) {
        this.slotHolder.replaceChildren(this.slotNode);
      }
    }
  }

  /** Build a 20×20 settings-gear SVG matching `button.icon.example.ts`. */
  private buildIconNode(): SVGSVGElement {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', PlaygroundComponent.ICON_SVG_PATH);
    svg.appendChild(path);
    return svg;
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
