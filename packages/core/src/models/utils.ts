import {Page} from "./PagingAndSorting";

export function emptyPage<T>(): Page<T> {
    return {
        page: 0,
        pageSize: 0,
        totalPages: 0,
        items: [],
        totalItems: 0,
    };
}
