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
    return p.kind === 'bg' ? `Background — ${p.slot}` : `Foreground — ${p.slot}`;
  });

  protected readonly fineHex = computed(() => {
    const p = this.payload();
    if (!p) return '#000000';
    const draft = this.draftService.draft();
    return p.kind === 'bg'
      ? oklchToHex(draft.bg[p.slot])
      : oklchToHex(draft.fg[p.slot]);
  });

  /** Highlight seed grid only when editing `bg-primary` and the user hasn't touched other slots. */
  protected readonly activeSeedHex = computed<string | null>(() => {
    const p = this.payload();
    if (!p || p.kind !== 'bg' || p.slot !== 'bg-primary') return null;
    if (this.draftService.dirtySlots().size > 0) return null;
    return this.draftService.draft().bg['bg-primary'];
  });

  protected applyHex(hex: string): void {
    const p = this.payload();
    if (!p) return;
    const css = hexToOklch(hex);
    if (p.kind === 'bg') {
      this.draftService.setBg(p.slot, css);
    } else {
      this.draftService.setFg(p.slot, css);
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
