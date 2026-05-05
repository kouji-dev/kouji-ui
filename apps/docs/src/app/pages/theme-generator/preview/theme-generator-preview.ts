import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjInputComponent } from '@kouji-ui/components';

@Component({
  selector: 'kj-theme-generator-preview',
  standalone: true,
  imports: [KjInputComponent],
  templateUrl: './theme-generator-preview.html',
  styleUrl: './theme-generator-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeGeneratorPreviewComponent {}
