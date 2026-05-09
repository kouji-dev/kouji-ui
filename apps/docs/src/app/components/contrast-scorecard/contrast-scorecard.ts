import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { KjBadgeComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { ContrastScoreService } from '../../services/contrast-score.service';
import type { Edge, TypographyCheck } from '../../lib/theme/theme-a11y-report';

/** Live theme-token accessibility scorecard for the active draft.
 * Groups results into Contrast (AAA 7:1), Non-text (3:1), and Typography. */
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

  /** Share of AAA-normal edge pairs that pass (for summary badge). */
  protected readonly aaaPercent = computed(() => {
    const s = this.report().summary;
    if (s.aaaNormalTotal === 0) return 100;
    return Math.round((100 * s.aaaNormalPass) / s.aaaNormalTotal);
  });

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
