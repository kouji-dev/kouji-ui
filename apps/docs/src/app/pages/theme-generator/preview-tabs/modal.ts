import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  KjButtonComponent,
  KjCardComponent,
  KjFieldComponent,
  KjFieldLabelComponent,
  KjInputComponent,
} from '@kouji-ui/components';

/**
 * Preview scene 04 — Modal: destructive confirmation overlay.
 *
 * Mirrors SceneModal from the React reference. The dialog is rendered
 * inline (not via KjDialogService) on purpose — the preview stage shows
 * the chrome statically so token edits read legibly without focus-trap
 * teleportation.
 */
@Component({
  selector: 'kj-preview-modal',
  standalone: true,
  imports: [
    FormsModule,
    KjButtonComponent,
    KjCardComponent,
    KjFieldComponent,
    KjFieldLabelComponent,
    KjInputComponent,
  ],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewModal {
  protected readonly confirmText = signal('');
}
