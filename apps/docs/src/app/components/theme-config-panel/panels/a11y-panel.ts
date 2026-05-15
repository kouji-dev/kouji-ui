import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { KjDialogService, KjTooltipTrigger, KjTooltipContent } from '@kouji-ui/core';
import { KjTagComponent } from '@kouji-ui/components';
import { ContrastScoreService } from '../../../services/contrast-score.service';
import { ContrastScorecard } from '../../contrast-scorecard/contrast-scorecard';
import { ShapeMotionPanel } from './shape-motion-panel';
import { TypePanel } from './type-panel';
import { ThemeDraftService } from '../../../services/theme-draft.service';
import { ThemePaletteDialogContext } from '../../../services/theme-palette-dialog-context';
import { ThemePaletteDialogBody } from './theme-palette-dialog-body';
import { oklchToHex } from '../../../lib/theme/theme-color-utils';
import type { BgSlot, FgSlot } from '../../../lib/theme/types';
import type { Edge } from '../../../lib/theme/theme-a11y-report';

/** Surfaces row — 4 neutral backgrounds. */
const SURFACE_CHIPS = [
  { slot: 'bg-body'     as const, mark: 'Body' },
  { slot: 'bg-surface'  as const, mark: 'Surf' },
  { slot: 'bg-field'    as const, mark: 'Field' },
  { slot: 'bg-elevated' as const, mark: 'Elev' },
] as const;

/** Intent row — 6 intent backgrounds. */
const INTENT_CHIPS = [
  { slot: 'bg-primary' as const, mark: 'Pri' },
  { slot: 'bg-accent'  as const, mark: 'Acc' },
  { slot: 'bg-info'    as const, mark: 'Inf' },
  { slot: 'bg-success' as const, mark: 'Suc' },
  { slot: 'bg-warning' as const, mark: 'Wrn' },
  { slot: 'bg-danger'  as const, mark: 'Dng' },
] as const;

/** Foreground row — fg-default + 6 fg-on-* paired with intents. */
const FG_CHIPS = [
  { slot: 'fg-default'    as const, mark: 'Def' },
  { slot: 'fg-on-primary' as const, mark: 'Pri' },
  { slot: 'fg-on-accent'  as const, mark: 'Acc' },
  { slot: 'fg-on-info'    as const, mark: 'Inf' },
  { slot: 'fg-on-success' as const, mark: 'Suc' },
  { slot: 'fg-on-warning' as const, mark: 'Wrn' },
  { slot: 'fg-on-danger'  as const, mark: 'Dng' },
] as const;

interface RibbonVm {
  accent: string;
  overlayLine: string;
  tooltipDetail: string;
}

@Component({
  selector: 'kj-a11y-panel',
  standalone: true,
  imports: [
    ContrastScorecard,
    KjTagComponent,
    KjTooltipTrigger,
    KjTooltipContent,
    ShapeMotionPanel,
    TypePanel,
  ],
  templateUrl: './a11y-panel.html',
  styleUrl: './a11y-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class A11yPanel {
  private readonly draftService = inject(ThemeDraftService);
  private readonly dialog = inject(KjDialogService);
  private readonly paletteCtx = inject(ThemePaletteDialogContext);
  private readonly contrastScore = inject(ContrastScoreService);

  protected readonly draft = this.draftService.draft;

  protected readonly scoreReport = computed(() =>
    this.contrastScore.buildReport(this.draftService.resolvedTokens(), this.draftService.draft()),
  );

  protected readonly surfaceChips = SURFACE_CHIPS;
  protected readonly intentChips  = INTENT_CHIPS;
  protected readonly fgChips      = FG_CHIPS;

  /** Worst-case AAA ribbon per bg slot. */
  protected readonly bgRibbons = computed(() => {
    this.scoreReport();
    const m = new Map<BgSlot, RibbonVm>();
    for (const c of [...SURFACE_CHIPS, ...INTENT_CHIPS]) {
      m.set(c.slot, this.buildRibbon(this.edgesForBg(c.slot)));
    }
    return m;
  });

  /** Worst-case AAA ribbon per fg slot. */
  protected readonly fgRibbons = computed(() => {
    this.scoreReport();
    const m = new Map<FgSlot, RibbonVm>();
    for (const c of FG_CHIPS) {
      m.set(c.slot, this.buildRibbon(this.edgesForFg(c.slot)));
    }
    return m;
  });

  /** Hex value for a bg slot (chip background paint). */
  protected hexForBg(slot: BgSlot): string {
    return oklchToHex(this.draft().bg[slot]);
  }

  /** Hex value for a fg slot (chip background paint). */
  protected hexForFg(slot: FgSlot): string {
    return oklchToHex(this.draft().fg[slot]);
  }

  protected openBg(slot: BgSlot): void {
    this.openPalette({ kind: 'bg', slot });
  }

  protected openFg(slot: FgSlot): void {
    this.openPalette({ kind: 'fg', slot });
  }

  private openPalette(payload: Parameters<ThemePaletteDialogContext['start']>[0]): void {
    this.paletteCtx.start(payload);
    const ref = this.dialog.open(ThemePaletteDialogBody);
    ref.afterClosed$.subscribe(() => this.paletteCtx.end());
  }

  /** Contrast edges that involve this bg slot (as the bg token). */
  private edgesForBg(slot: BgSlot): Edge[] {
    const r = this.scoreReport();
    return [...r.contrastEdges, ...r.nonTextEdges].filter(e => e.bgToken === slot);
  }

  /** Contrast edges that paint with this fg slot. */
  private edgesForFg(slot: FgSlot): Edge[] {
    return this.scoreReport().contrastEdges.filter(e => e.fgToken === slot);
  }

  private buildRibbon(edges: Edge[]): RibbonVm {
    const aa = edges.filter(e => e.requirement === 'AA-normal');
    if (aa.length === 0) {
      return {
        accent: 'color-mix(in oklch, var(--kj-fg-muted) 42%, transparent)',
        overlayLine: 'No AA-normal pairs',
        tooltipDetail:
          'No AA-normal contrast pairs reference this swatch. Other checks (e.g. UI 3:1) may still apply.',
      };
    }
    const worst = aa.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
    const minR = worst.ratio;
    const failCount = aa.filter(e => !e.pass).length;
    const accent = this.ribbonAccent(minR, failCount > 0);
    const overlayLine = `${minR.toFixed(2)}:1 · ${worst.verdict}`;
    const tooltipDetail =
      failCount === 0
        ? `Worst case among ${aa.length} AA-normal pair(s). Target: AA ≥4.5:1 (axe baseline) — all pass.`
        : `${failCount} of ${aa.length} pair(s) below AA 4.5:1 target.`;
    return { accent, overlayLine, tooltipDetail };
  }

  private ribbonAccent(minRatio: number, anyFail: boolean): string {
    if (anyFail) return 'var(--kj-bg-danger)';
    if (minRatio >= 7) return 'var(--kj-bg-success)';
    if (minRatio >= 4.5) return 'var(--kj-bg-warning)';
    return 'var(--kj-bg-danger)';
  }
}
