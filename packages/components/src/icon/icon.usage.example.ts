import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjIconDirective } from '@kouji-ui/core';

/**
 * Common icon usages — decorative inline, meaningful with a label, size
 * tokens, and semantic color tokens. Copy-paste starting point.
 */
@Component({
  selector: 'kj-icon-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjIconDirective],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
    .row { display: flex; gap: var(--kj-space-md); align-items: center; flex-wrap: wrap; }
    code { font: var(--kj-text-sm)/1 var(--kj-font-mono); color: var(--kj-fg-muted); }
  `],
  template: `
    <div class="row">
      <i kjIcon="search"></i>
      <span>Decorative — silent for AT, inherits text color</span>
    </div>

    <div class="row">
      <i kjIcon="alert-triangle" kjIconLabel="Warning"></i>
      <span>Meaningful — exposed as <code>role="img"</code> with a label</span>
    </div>

    <div class="row">
      <i kjIcon="circle" kjIconSize="xs"></i>
      <i kjIcon="circle" kjIconSize="sm"></i>
      <i kjIcon="circle" kjIconSize="md"></i>
      <i kjIcon="circle" kjIconSize="lg"></i>
      <i kjIcon="circle" kjIconSize="xl"></i>
    </div>

    <div class="row">
      <i kjIcon="check" kjIconColor="success"></i>
      <i kjIcon="info" kjIconColor="info"></i>
      <i kjIcon="alert-triangle" kjIconColor="warning"></i>
      <i kjIcon="x-circle" kjIconColor="danger"></i>
      <i kjIcon="circle" kjIconColor="muted"></i>
    </div>
  `,
})
export class KjIconUsageExample {}
