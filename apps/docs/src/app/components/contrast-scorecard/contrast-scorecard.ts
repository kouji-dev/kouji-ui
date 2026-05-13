import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { KjBadgeComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { ContrastScoreService } from '../../services/contrast-score.service';
import type { Edge, TypographyCheck } from '../../lib/theme/theme-a11y-report';

/** Live theme-token accessibility scorecard for the active draft.
 * Groups results into Contrast (AA 4.5:1, matching axe), Non-text (3:1), and Typography. */
@Component({
  selector: 'kj-contrast-scorecard',
  standalone: true,
  imports: [KjBadgeComponent],
  templateUrl: './contrast-scorecard.html',
  styleUrl: './contrast-scorecard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContrastScorecard {
  private readonly draftService = inject(ThemeDraftService);
  private readonly score = inject(ContrastScoreService);

  protected readonly report = computed(() =>
    this.score.buildReport(this.draftService.resolvedTokens(), this.draftService.draft()),
  );

  /** Share of AA-normal edge pairs that pass (for summary badge). */
  protected readonly aaPercent = computed(() => {
    const s = this.report().summary;
    if (s.aaNormalTotal === 0) return 100;
    return Math.round((100 * s.aaNormalPass) / s.aaNormalTotal);
  });
  /** Backwards-compat alias for the template. */
  protected readonly aaaPercent = this.aaPercent;

  protected focusToken(slot: string): void {
    if (typeof document === 'undefined') return;
    const el = document.querySelector<HTMLElement>(`[data-token-slot="${slot}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus();
  }

  protected ariaForEdge(e: Edge): string {
    const verdict = e.pass ? `passes ${e.requirement}` : `fails ${e.requirement}`;
    return `${e.fgToken} on ${e.bgToken}, contrast ${e.ratio.toFixed(2)} to 1, ${verdict}`;
  }

  protected ariaForTypography(c: TypographyCheck): string {
    return `${c.id}: ${c.pass ? 'pass' : 'warning'} — ${c.message}`;
  }
}
