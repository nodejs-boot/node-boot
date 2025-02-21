import {SortOrder} from "@nodeboot/core";

export class PagingRequest {
    page?: number;
    pageSize?: number;
    sortOrder?: SortOrder;
    sortField?: string;
}

export class CursorRequest {
    pageSize?: number;
    // Used for MongoDB
    lastId?: string;
    // Used for SQL databases
    cursor?: string | number | Date;
    sortOrder?: SortOrder;
    sortField?: string;
}

export type Page<T> = {
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    items: T[];
};

export type CursorPage<T> = {
    pageSize: number;
    // Used for SQL databases
    cursor?: string;
    // Used for MongoDB
    lastId?: string;
    items: T[];
};
