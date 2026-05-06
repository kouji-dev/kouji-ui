import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeGeneratorSidebarComponent } from '../../components/theme-generator-sidebar/theme-generator-sidebar';

@Component({
  selector: 'kj-theme-generator-shell',
  standalone: true,
  imports: [RouterOutlet, ThemeGeneratorSidebarComponent],
  templateUrl: './theme-generator-shell.html',
  styleUrl: './theme-generator-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorShellComponent {}
