import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjButtonComponent } from '../button/button';
import { KjButtonGroupComponent } from './button-group';

/**
 * Common button-group shapes — segmented toolbar, vertical stack, and a
 * variant-cascaded cluster. Use this as the copy-paste starting point.
 */
@Component({
  selector: 'kj-button-group-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjButtonGroupComponent, KjButtonComponent],
  styles: [`:host { display: flex; flex-direction: column; gap: var(--kj-space-md); }`],
  template: `
    <kj-button-group kjAriaLabel="Document actions">
      <kj-button kjVariant="outline">Save</kj-button>
      <kj-button kjVariant="outline">Cancel</kj-button>
      <kj-button kjVariant="outline">Delete</kj-button>
    </kj-button-group>

    <kj-button-group kjOrientation="vertical" kjAriaLabel="Sort">
      <kj-button kjVariant="ghost">Newest</kj-button>
      <kj-button kjVariant="ghost">Oldest</kj-button>
      <kj-button kjVariant="ghost">A–Z</kj-button>
    </kj-button-group>

    <kj-button-group kjVariant="default" kjSize="sm" kjAriaLabel="Pagination">
      <kj-button>1</kj-button>
      <kj-button>2</kj-button>
      <kj-button>3</kj-button>
    </kj-button-group>
  `,
})
export class KjButtonGroupUsageExample {}
