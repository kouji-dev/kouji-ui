import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SEED_SWATCHES, HUE_FAMILIES, type SeedSwatch, type HueFamily } from '../../lib/theme/seed-swatches';

@Component({
  selector: 'kj-seed-swatch-grid',
  standalone: true,
  templateUrl: './seed-swatch-grid.html',
  styleUrl: './seed-swatch-grid.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeedSwatchGrid {
  readonly activeHex = input<string | null>(null);
  readonly seedPicked = output<string>();

  protected readonly grouped = computed<{ family: HueFamily; items: readonly SeedSwatch[] }[]>(() =>
    HUE_FAMILIES.map(family => ({
      family,
      items: SEED_SWATCHES.filter(s => s.hueFamily === family),
    })).filter(g => g.items.length > 0),
  );

  protected isActive(hex: string): boolean {
    return (this.activeHex() ?? '').toLowerCase() === hex.toLowerCase();
  }

  protected pick(hex: string): void {
    this.seedPicked.emit(hex);
  }
}
