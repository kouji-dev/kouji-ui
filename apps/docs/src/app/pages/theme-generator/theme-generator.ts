import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';

@Component({
  selector: 'kj-theme-generator',
  standalone: true,
  imports: [DocsSidebarComponent],
  templateUrl: './theme-generator.html',
  styleUrl: './theme-generator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorComponent {}
