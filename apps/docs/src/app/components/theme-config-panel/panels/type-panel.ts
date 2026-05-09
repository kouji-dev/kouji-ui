import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { KjOptionComponent, KjSelectComponent, KjTagComponent, KjTagListComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../../services/theme-draft.service';
import { ContrastScoreService } from '../../../services/contrast-score.service';
import { FontLoaderService } from '../../../services/font-loader.service';
import { kjVariantForTypographyCheck } from '../../../lib/theme/edge-tag-variant';
import { CURATED_FONTS, type CuratedFont } from '../../../lib/theme/font-catalog';
import type { FontKey } from '../../../lib/theme/types';

@Component({
  selector: 'kj-type-panel',
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent, KjTagComponent, KjTagListComponent],
  templateUrl: './type-panel.html',
  styleUrl: './type-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypePanel {
  private readonly draftService = inject(ThemeDraftService);
  private readonly fontLoader = inject(FontLoaderService);
  private readonly contrastScore = inject(ContrastScoreService);

  protected readonly draft = this.draftService.draft;

  protected readonly scoreReport = computed(() =>
    this.contrastScore.buildReport(this.draftService.resolvedTokens(), this.draftService.draft()),
  );
  protected readonly fonts: readonly CuratedFont[] = CURATED_FONTS;

  protected readonly tagVariantForTypography = kjVariantForTypographyCheck;

  protected fontIdFor(key: FontKey): string {
    const family = this.draft().type[key];
    return CURATED_FONTS.find(f => family.includes(f.family))?.id ?? 'system-ui';
  }

  protected onFont(key: FontKey, fontId: unknown): void {
    if (typeof fontId !== 'string' || fontId === '') return;
    const font = CURATED_FONTS.find(f => f.id === fontId);
    if (!font) return;
    this.fontLoader.ensureLoaded(fontId);
    const stack =
      font.category === 'mono'
        ? `'${font.family}', monospace`
        : font.category === 'serif'
          ? `'${font.family}', serif`
          : `'${font.family}', system-ui, sans-serif`;
    this.draftService.setFont(key, stack);
  }
}
