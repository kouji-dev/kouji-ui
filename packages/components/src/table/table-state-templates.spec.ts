import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { KjTableComponent } from './table';
import {
  KjTableEmptyTemplate,
  KjTableErrorTemplate,
  KjTableLoadingTemplate,
} from './table-state-templates';
import { kjColumn, kjTableResource, type KjTableState } from '@kouji-ui/core';

class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
});

interface User {
  id: string;
  name: string;
}

const cols = [kjColumn<User>({ accessorKey: 'name', header: 'Name' })];

const INITIAL_STATE: KjTableState = {
  sorting: [],
  columnFilters: [],
  globalFilter: '',
  pagination: { pageIndex: 0, pageSize: 25 },
  rowSelection: {},
  columnSizing: {},
  columnVisibility: {},
  columnOrder: [],
  columnPinning: { left: [], right: [] },
  expanded: {},
  grouping: [],
  density: 'standard',
};

@Component({
  standalone: true,
  imports: [KjTableComponent, KjTableEmptyTemplate],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-table [kjData]="data()" [kjColumns]="cols">
      <ng-template kjEmptyTemplate><span>Nothing here</span></ng-template>
    </kj-table>
  `,
})
class EmptyTplHost {
  readonly data = signal<User[]>([]);
  protected readonly cols = cols;
}

@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-table [kjData]="data" [kjColumns]="cols">
      <div kjEmpty>Legacy slot</div>
    </kj-table>
  `,
})
class EmptySlotHost {
  protected readonly data: User[] = [];
  protected readonly cols = cols;
}

@Component({
  standalone: true,
  imports: [KjTableComponent, KjTableLoadingTemplate],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-table [kjData]="data" [kjColumns]="cols" [kjLoading]="true">
      <ng-template kjLoadingTemplate><span>Spinning</span></ng-template>
    </kj-table>
  `,
})
class LoadingTplHost {
  protected readonly data: User[] = [];
  protected readonly cols = cols;
}

@Component({
  standalone: true,
  imports: [KjTableComponent, KjTableErrorTemplate],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-table [kjColumns]="cols" [kjResource]="res">
      <ng-template kjErrorTemplate><span>Boom</span></ng-template>
    </kj-table>
  `,
})
class ErrorTplHost {
  protected readonly cols = cols;
  protected readonly state = signal<KjTableState>(INITIAL_STATE);
  protected readonly res = kjTableResource<User>({
    stateSignal: this.state,
    loader: async () => {
      throw new Error('nope');
    },
  });
}

describe('table state templates', () => {
  it('renders kjEmptyTemplate content in the empty pane', async () => {
    const { container, getByText } = await render(EmptyTplHost);
    expect(getByText('Nothing here')).toBeInTheDocument();
    expect(container.querySelector('.kj-table-empty')).toBeTruthy();
  });

  it('marks the host data-empty so the pane can claim the leftover height', async () => {
    const { container } = await render(EmptyTplHost);
    expect(container.querySelector('kj-table')?.hasAttribute('data-empty')).toBe(true);
  });

  it('drops data-empty once rows arrive, and tears the template down', async () => {
    const { container, fixture, queryByText } = await render(EmptyTplHost);
    fixture.componentInstance.data.set([{ id: '1', name: 'A' }]);
    await fixture.whenStable();
    expect(container.querySelector('kj-table')?.hasAttribute('data-empty')).toBe(false);
    expect(queryByText('Nothing here')).toBeNull();
  });

  it('still honours the legacy [kjEmpty] slot when no template is given', async () => {
    const { getByText } = await render(EmptySlotHost);
    expect(getByText('Legacy slot')).toBeInTheDocument();
  });

  it('renders kjLoadingTemplate instead of the built-in fallback', async () => {
    const { container, getByText } = await render(LoadingTplHost);
    expect(getByText('Spinning')).toBeInTheDocument();
    expect(container.querySelector('.kj-table-loading-fallback')).toBeNull();
  });

  it('renders kjErrorTemplate when the resource rejects', async () => {
    const { container, fixture, getByText } = await render(ErrorTplHost);
    await fixture.whenStable();
    expect(getByText('Boom')).toBeInTheDocument();
    expect(container.querySelector('.kj-table-error')).toBeTruthy();
  });
});
