import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { KjDialogRef } from '@kouji-ui/core';
import { KjButtonComponent, KjInputComponent } from '@kouji-ui/components';
import { SeedSwatchGrid } from '../../seed-swatch-grid/seed-swatch-grid';
import { ThemeDraftService } from '../../../services/theme-draft.service';
import {
  ThemePaletteDialogContext,
  type ThemePalettePayload,
} from '../../../services/theme-palette-dialog-context';
import { hexToOklch, oklchToHex } from '../../../lib/theme/theme-color-utils';
import type { ContentSlot } from '../../../lib/theme/types';

@Component({
  selector: 'kj-theme-palette-dialog-body',
  standalone: true,
  imports: [KjButtonComponent, SeedSwatchGrid, KjInputComponent],
  templateUrl: './theme-palette-dialog-body.html',
  styleUrl: './theme-palette-dialog-body.css',
  host: {
    '[attr.aria-labelledby]': '"palette-dialog-title"',
    '[attr.aria-describedby]': '"palette-dialog-hint"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemePaletteDialogBody {
  private readonly draftService = inject(ThemeDraftService);
  private readonly ctx = inject(ThemePaletteDialogContext);
  readonly ref = inject<KjDialogRef<ThemePaletteDialogBody, void>>(KjDialogRef);

  protected readonly payload = computed<ThemePalettePayload | null>(() => this.ctx.payload());

  protected readonly title = computed(() => {
    const p = this.payload();
    if (!p) return 'Pick a color';
    if (p.kind === 'semantic-fill') return `Fill — ${p.slot}`;
    if (p.kind === 'semantic-content') return `Content — ${p.slot}`;
    return `Surface — ${p.slot}`;
  });

  protected readonly fineHex = computed(() => {
    const p = this.payload();
    if (!p) return '#000000';
    const draft = this.draftService.draft();
    const tokens = this.draftService.resolvedTokens();
    if (p.kind === 'semantic-fill') {
      return oklchToHex(draft.colors[p.slot]);
    }
    if (p.kind === 'semantic-content') {
      const key: ContentSlot =
        p.slot === 'base-100' ? 'base-content' : (`${p.slot}-content` as ContentSlot);
      return oklchToHex(tokens.contents[key]);
    }
    if (p.slot === 'base-200') return oklchToHex(tokens.derivedBase.base200);
    if (p.slot === 'base-300') return oklchToHex(tokens.derivedBase.base300);
    return oklchToHex(tokens.contents['base-content']);
  });

  /** Highlight seed grid when editing primary and draft matches a single-seed derivation (same heuristic as colors panel). */
  protected readonly activeSeedHex = computed<string | null>(() => {
    const p = this.payload();
    if (!p || p.kind !== 'semantic-fill' || p.slot !== 'primary') return null;
    if (this.draftService.dirtySlots().size > 0) return null;
    return this.draftService.draft().colors.primary;
  });

  protected applyHex(hex: string): void {
    const p = this.payload();
    if (!p) return;
    const css = hexToOklch(hex);
    if (p.kind === 'semantic-fill') {
      this.draftService.setColor(p.slot, css);
    } else if (p.kind === 'semantic-content') {
      const key: ContentSlot =
        p.slot === 'base-100' ? 'base-content' : (`${p.slot}-content` as ContentSlot);
      this.draftService.setContentOverride(key, css);
    } else {
      this.draftService.setContentOverride(p.slot, css);
    }
  }

  protected onSeedPicked(hex: string): void {
    this.applyHex(hex);
    this.done();
  }

  protected onFineInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.applyHex(v);
  }

  protected done(): void {
    this.ref.close();
  }
}
