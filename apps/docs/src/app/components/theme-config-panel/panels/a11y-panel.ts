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
import type { ColorSlot, ContentSlot } from '../../../lib/theme/types';
import type { Edge } from '../../../lib/theme/theme-a11y-report';
/**
 * Brand + semantic fills (excluding base canvas — see Base strip).
 * Same order as the Main chip row.
 */
const MAIN_FILL_SLOTS: readonly ColorSlot[] = [
  'primary',
  'secondary',
  'accent',
  'neutral',
  'info',
  'success',
  'warning',
  'destructive',
];

/** Top ribbon + tooltip copy for worst AAA-normal case per swatch. */
interface AaaRibbonVm {
  accent: string;
  /** First line in tooltip: ratio · verdict (AA / AAA / …). */
  overlayLine: string;
  /** Second line: AA/AAA threshold context and pass counts. */
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
  /** Semantic fill chips (Main row). */
  protected readonly mainFillChips = [
    { slot: 'primary' as const, mark: 'Pri' },
    { slot: 'secondary' as const, mark: 'Sec' },
    { slot: 'accent' as const, mark: 'Acc' },
    { slot: 'neutral' as const, mark: 'Neu' },
    { slot: 'info' as const, mark: 'Inf' },
    { slot: 'success' as const, mark: 'Suc' },
    { slot: 'warning' as const, mark: 'Wrn' },
    { slot: 'destructive' as const, mark: 'Dst' },
  ] as const;

  /** AAA-normal ribbon model per Base swatch. */
  protected readonly ribbonBase = computed(() => {
    this.scoreReport();
    return {
      b100: this.buildAaaRibbon(this.edgesForSemantic('base-100')),
      b200: this.buildAaaRibbon(this.edgesForDerived('base-200')),
      b300: this.buildAaaRibbon(this.edgesForDerived('base-300')),
      bContent: this.buildAaaRibbon(this.edgesForDerived('base-content')),
    };
  });

  /** AAA-normal ribbon per Main fill chip (fill-related edges only). */
  protected readonly ribbonMainFill = computed(() => {
    this.scoreReport();
    const m = new Map<ColorSlot, AaaRibbonVm>();
    for (const slot of MAIN_FILL_SLOTS) {
      const edges = this.edgesForSemantic(slot).filter(e => !this.isSemanticContentFgToken(e.fgToken));
      m.set(slot, this.buildAaaRibbon(edges));
    }
    return m;
  });

  /** AAA-normal ribbon per Text chip (*-content foreground edges). */
  protected readonly ribbonText = computed(() => {
    this.scoreReport();
    const m = new Map<ColorSlot, AaaRibbonVm>();
    for (const slot of MAIN_FILL_SLOTS) {
      m.set(slot, this.buildAaaRibbon(this.edgesForSemanticContentFg(slot)));
    }
    return m;
  });

  /** Contrast edges whose scored pair involves this derived surface/content token. */
  protected edgesForDerived(slot: ContentSlot): Edge[] {
    const r = this.scoreReport();
    const { contrastEdges: ce, nonTextEdges: ne } = r;
    if (slot === 'base-200') {
      return [
        ...ce.filter(e => e.fgToken === 'base-content' && e.bgToken === 'base-200'),
        ...ne.filter(e => e.fgToken === 'base-300' && e.bgToken === 'base-200'),
      ];
    }
    if (slot === 'base-300') {
      return [
        ...ce.filter(e => e.fgToken === 'base-content' && e.bgToken === 'base-300'),
        ...ne.filter(e => e.fgToken === 'base-300'),
      ];
    }
    return ce.filter(e => e.fgToken === 'base-content');
  }

  /** Contrast edges where text paint is the semantic *-content token. */
  private edgesForSemanticContentFg(slot: ColorSlot): Edge[] {
    const ct = `${slot}-content`;
    return this.scoreReport().contrastEdges.filter(e => e.fgToken === ct);
  }

  private isSemanticContentFgToken(t: string): boolean {
    return MAIN_FILL_SLOTS.some(s => `${s}-content` === t);
  }

  /** Contrast edges for semantic fills (fill on canvas + content-on-fill). */
  protected edgesForSemantic(slot: ColorSlot): Edge[] {
    const ce = this.scoreReport().contrastEdges;
    if (slot === 'base-100') {
      return ce.filter(
        e =>
          (e.fgToken === 'base-content' && e.bgToken === 'base-100') ||
          (e.fgToken === 'primary' && e.bgToken === 'base-100'),
      );
    }
    const contentTok = `${slot}-content`;
    const onFill = ce.filter(e => e.fgToken === contentTok && e.bgToken === slot);
    const onCanvas = ce.filter(
      e => e.fgToken === slot && (e.bgToken === 'base-100' || e.bgToken === 'base-200'),
    );
    return [...onFill, ...onCanvas];
  }

  protected hexFor(slot: ColorSlot): string {
    return oklchToHex(this.draft().colors[slot]);
  }

  protected hexForDerived(slot: ContentSlot): string {
    const tokens = this.draftService.resolvedTokens();
    let value: string;
    if (slot === 'base-200') value = tokens.derivedBase.base200;
    else if (slot === 'base-300') value = tokens.derivedBase.base300;
    else value = tokens.contents[slot];
    return oklchToHex(value);
  }

  protected openSemanticFill(slot: ColorSlot): void {
    this.openPalette({ kind: 'semantic-fill', slot });
  }

  protected openSemanticContent(slot: ColorSlot): void {
    this.openPalette({ kind: 'semantic-content', slot });
  }

  /** Resolved hex for on-fill text (`primary-content`, …). */
  protected hexForSemanticContent(slot: ColorSlot): string {
    const key = `${slot}-content` as ContentSlot;
    return oklchToHex(this.draftService.resolvedTokens().contents[key]);
  }

  protected openDerived(slot: ContentSlot): void {
    this.openPalette({ kind: 'derived', slot });
  }

  private openPalette(payload: Parameters<ThemePaletteDialogContext['start']>[0]): void {
    this.paletteCtx.start(payload);
    const ref = this.dialog.open(ThemePaletteDialogBody);
    ref.afterClosed$.subscribe(() => this.paletteCtx.end());
  }

  /**
   * Worst AAA-normal pair for this swatch → ribbon color; hover/focus shows worst ratio + verdict.
   */
  private buildAaaRibbon(edges: Edge[]): AaaRibbonVm {
    const aaa = edges.filter(e => e.requirement === 'AAA-normal');
    if (aaa.length === 0) {
      return {
        accent: 'color-mix(in oklch, var(--kj-fg-muted) 42%, transparent)',
        overlayLine: 'No AAA-normal pairs',
        tooltipDetail:
          'No AAA-normal contrast pairs reference this swatch. Other checks (e.g. UI 3:1) may still apply.',
      };
    }
    const worst = aaa.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
    const minR = worst.ratio;
    const failCount = aaa.filter(e => !e.pass).length;
    const accent = this.ribbonAccent(minR, failCount > 0);
    const overlayLine = `${minR.toFixed(2)}:1 · ${worst.verdict}`;
    const tooltipDetail =
      failCount === 0
        ? `Worst case among ${aaa.length} AAA-normal pair(s). Targets: AA ≥4.5:1, AAA ≥7:1 for normal text — all pass.`
        : `${failCount} of ${aaa.length} pair(s) below AA or AAA target (AA ≥4.5:1, AAA ≥7:1).`;
    return { accent, overlayLine, tooltipDetail };
  }

  private ribbonAccent(minRatio: number, anyFail: boolean): string {
    if (anyFail) return 'var(--kj-bg-danger)';
    if (minRatio >= 7) return 'var(--kj-bg-success)';
    if (minRatio >= 4.5) return 'var(--kj-bg-warning)';
    return 'var(--kj-bg-danger)';
  }
}
