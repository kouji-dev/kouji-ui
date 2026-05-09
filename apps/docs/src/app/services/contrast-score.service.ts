import { Injectable } from '@angular/core';
import type { ResolvedTokens, DraftTheme } from '../lib/theme/types';
import {
  buildThemeA11yReport,
  contrastRatio,
  verdictFor,
  type ThemeA11yReport,
  type Verdict,
} from '../lib/theme/theme-a11y-report';

@Injectable({ providedIn: 'root' })
export class ContrastScoreService {
  /** WCAG 2.x ratio between any two CSS colors. */
  ratio(a: string, b: string): number {
    return contrastRatio(a, b);
  }

  /** Coarse verdict label for a ratio. */
  verdict(r: number): Verdict {
    return verdictFor(r);
  }

  /** Build the full theme-token accessibility report. */
  buildReport(resolved: ResolvedTokens, draft: DraftTheme): ThemeA11yReport {
    return buildThemeA11yReport(resolved, draft);
  }
}
