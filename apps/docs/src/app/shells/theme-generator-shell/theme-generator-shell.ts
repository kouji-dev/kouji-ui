import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeRail } from '../../components/theme-rail/theme-rail';

@Component({
  selector: 'kj-theme-generator-shell',
  standalone: true,
  imports: [RouterOutlet, ThemeRail],
  templateUrl: './theme-generator-shell.html',
  styleUrl: './theme-generator-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorShellComponent {}
