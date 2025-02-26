import {Model, SortOrder} from "@nodeboot/core";

@Model()
export class PagingRequest {
    page?: number;
    pageSize?: number;
    sortOrder?: SortOrder;
    sortField?: string;
}

@Model()
export class CursorRequest {
    pageSize?: number;
    // Used for MongoDB
    lastId?: string;
    // Used for SQL databases
    cursor?: string | number | Date;
    sortOrder?: SortOrder;
    sortField?: string;
}

@Model()
export class Page<T> {
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    items: T[];
}

@Model()
export class CursorPage<T> {
    pageSize: number;
    // Used for SQL databases
    cursor?: string;
    // Used for MongoDB
    lastId?: string;
    items: T[];
}
