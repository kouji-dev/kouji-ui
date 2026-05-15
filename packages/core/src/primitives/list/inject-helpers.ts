import { inject } from '@angular/core';
import { KjListItem } from './item';
import { KjSelectionModel } from './selection';
// KjFilterableList is added in Task 5; import re-enabled when that file lands.
// import { KjFilterableList } from './filterable-list';

export const injectListItem = <T>() => inject(KjListItem) as KjListItem<T>;
export const injectSelectionModel = <T>() => inject(KjSelectionModel) as KjSelectionModel<T>;
// export const injectFilterableList = <T>() => inject(KjFilterableList) as KjFilterableList<T>;
