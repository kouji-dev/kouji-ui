import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DocsSidebarComponent } from '../../components/docs-sidebar/docs-sidebar';

@Component({
  selector: 'kj-docs-shell',
  standalone: true,
  imports: [RouterOutlet, DocsSidebarComponent],
  templateUrl: './docs-shell.html',
  styleUrl: './docs-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsShellComponent {}
