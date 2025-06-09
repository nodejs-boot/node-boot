import {IsEnum, IsPositive} from "class-validator";
import {Model, Property} from "../decorators";

export enum SortOrder {
    ASC = "ASC",
    DESC = "DESC",
}

@Model()
export class PagingRequest {
    @IsPositive()
    @Property({description: "Current page number"})
    page?: number;
    @Property({description: "Number of records per page"})
    pageSize?: number;
    @IsEnum(SortOrder)
    @Property({
        required: false,
        description: "The sort direction (`ASC` for ascending, `DESC` for descending, default: `ASC`)",
    })
    sortOrder?: SortOrder;
    @Property({description: "The field used for sorting"})
    sortField?: string;
}

@Model()
export class CursorRequest {
    @Property({description: "Number of items per page (default: 10)"})
    pageSize?: number;
    // Used for MongoDB
    @Property({description: "The `_id` of the last item from the previous page (optional)"})
    lastId?: string;
    // Used for SQL databases
    @Property({description: "The last seen value of the `sortField` from the previous page (optional)"})
    cursor?: string;
    @IsEnum(SortOrder)
    @Property({
        required: false,
        description: "The sort direction (`ASC` for ascending, `DESC` for descending, default: `ASC`)",
    })
    sortOrder?: SortOrder;
    @Property({description: "The field used for sorting"})
    sortField?: string;
}

@Model()
export class Page<T> {
    @Property({description: "Page number (default: 1)"})
    page: number;
    @Property({description: "Total number of pages"})
    totalPages: number;
    @Property({description: "Total number of items"})
    totalItems: number;
    @Property({description: "Number of items per page (default: 10)"})
    pageSize: number;
    @Property({description: "Items of current page", itemType: "T"})
    items: T[];
}

@Model()
export class CursorPage<T> {
    @Property({description: "Number of items per page (default: 10)"})
    pageSize: number;
    // Used for SQL databases
    @Property({description: "The last seen value of the `sortField` from the previous page (optional)"})
    cursor?: string;
    // Used for MongoDB
    @Property({description: "The `_id` of the last item from the previous page (optional)"})
    lastId?: string;
    @Property({description: "Items of current page", itemType: "T"})
    items: T[];
}
