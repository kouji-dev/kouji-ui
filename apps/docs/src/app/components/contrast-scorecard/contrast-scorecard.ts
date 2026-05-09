import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { KjBadgeComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../services/theme-draft.service';
import { ContrastScoreService, type PairResult } from '../../services/contrast-score.service';

/** Live AAA contrast scorecard for the active draft.
 * One row per scored pair plus a summary showing AAA pass percent. */
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

  protected readonly report = computed(() => this.score.scorePalette(this.draftService.resolvedTokens()));

  protected focusToken(slot: string): void {
    if (typeof document === 'undefined') return;
    const el = document.querySelector<HTMLElement>(`[data-token-slot="${slot}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus();
  }

  protected ariaForPair(p: PairResult): string {
    const verdict = p.pass ? `passes ${p.verdict}` : 'fails AAA';
    return `${p.fg} on ${p.bg}, contrast ${p.ratio.toFixed(2)} to 1, ${verdict}`;
  }
}
