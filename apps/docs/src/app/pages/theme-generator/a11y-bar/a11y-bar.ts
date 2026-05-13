import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
} from '@angular/core';
import {
  KjOptionComponent,
  KjSelectComponent,
  KjToggleComponent,
} from '@kouji-ui/components';
import { ThemeDraftService } from '../../../services/theme-draft.service';
import { ContrastScoreService } from '../../../services/contrast-score.service';

export type CbSim =
  | 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

interface ChipVm {
  id: string;
  label: string;
  ratio: number;
  grade: 'AAA' | 'AA' | 'fail';
}

/**
 * Compact accessibility strip displayed above the preview stage.
 *
 * Shows the live a11y score, a row of contrast chips for the most important
 * token pairs, and three operator toggles that the preview stage reads as
 * data attributes: colorblind simulation filter, focus-ring visualization,
 * and reduced-motion override.
 */
@Component({
  selector: 'kj-theme-a11y-bar',
  standalone: true,
  imports: [
    KjSelectComponent,
    KjOptionComponent,
    KjToggleComponent,
  ],
  templateUrl: './a11y-bar.html',
  styleUrl: './a11y-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class A11yBar {
  private readonly draftService = inject(ThemeDraftService);
  private readonly contrastScore = inject(ContrastScoreService);

  readonly cbSim         = model<CbSim>('none');
  readonly reducedMotion = model(false);
  readonly focusTest     = model(false);

  protected readonly report = computed(() =>
    this.contrastScore.buildReport(this.draftService.resolvedTokens(), this.draftService.draft()),
  );

  protected readonly chips = computed<ChipVm[]>(() => {
    const r = this.report();
    const pairs: { id: string; label: string; bgToken: string; fgToken: string }[] = [
      { id: 'text-body',    label: 'TEXT/BG',    bgToken: 'bg-body',    fgToken: 'fg-default' },
      { id: 'text-surface', label: 'TEXT/SURF',  bgToken: 'bg-surface', fgToken: 'fg-default' },
      { id: 'on-primary',   label: 'PRIMARY',    bgToken: 'bg-primary', fgToken: 'fg-on-primary' },
      { id: 'on-accent',    label: 'ACCENT',     bgToken: 'bg-accent',  fgToken: 'fg-on-accent' },
      { id: 'on-danger',    label: 'DANGER',     bgToken: 'bg-danger',  fgToken: 'fg-on-danger' },
      { id: 'on-success',   label: 'SUCCESS',    bgToken: 'bg-success', fgToken: 'fg-on-success' },
    ];
    return pairs.map(p => {
      const edge = r.contrastEdges.find(e => e.bgToken === p.bgToken && e.fgToken === p.fgToken);
      const ratio = edge?.ratio ?? 0;
      const grade: ChipVm['grade'] =
        ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'fail';
      return { id: p.id, label: p.label, ratio, grade };
    });
  });

  protected readonly score = computed(() => {
    const cs = this.chips();
    const pass = cs.filter(c => c.grade !== 'fail').length;
    return Math.round((pass / Math.max(1, cs.length)) * 100);
  });

  protected readonly overall = computed<'AAA' | 'AA' | 'fail'>(() => {
    const cs = this.chips();
    const aaa = cs.filter(c => c.grade === 'AAA').length;
    const aa  = cs.filter(c => c.grade !== 'fail').length;
    if (aaa >= 4) return 'AAA';
    if (aa  >= 4) return 'AA';
    return 'fail';
  });

  protected setCbSim(v: unknown): void {
    if (typeof v !== 'string') return;
    this.cbSim.set(v as CbSim);
  }
}
