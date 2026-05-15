import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'kj-theme-generator-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './theme-generator-shell.html',
  styleUrl: './theme-generator-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorShellComponent {}
