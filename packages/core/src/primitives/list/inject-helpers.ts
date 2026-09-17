import { inject } from '@angular/core';
import { KjListItem } from './item';
import { KjSelectionModel } from './selection';
import { KjFilterableList } from './filterable-list';

/** Injects the enclosing `KjListItem`, typed to the item's value. */
export const injectListItem = <T>() => inject(KjListItem) as KjListItem<T>;
/** Injects the enclosing `KjSelectionModel`, typed to the selected value. */
export const injectSelectionModel = <T>() => inject(KjSelectionModel) as KjSelectionModel<T>;
/** Injects the enclosing `KjFilterableList`, typed to the item's value. */
export const injectFilterableList = <T>() => inject(KjFilterableList) as KjFilterableList<T>;
