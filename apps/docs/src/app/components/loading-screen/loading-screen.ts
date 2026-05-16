import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { KjLoaderFigure } from './loader-figures';

@Component({
  selector: 'kj-loading-screen',
  standalone: true,
  imports: [KjLoaderFigure],
  templateUrl: './loading-screen.html',
  styleUrl: './loading-screen.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingScreenComponent {
  private readonly themeService = inject(ThemeService);
  protected readonly theme = this.themeService.theme;
}
