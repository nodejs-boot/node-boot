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
    @Property({required: false, description: "Number of records per page"})
    pageSize?: number;
    @IsEnum(SortOrder)
    @Property({required: false})
    sortOrder?: SortOrder;
    @Property({required: false, description: "The field used for sorting"})
    sortField?: string;
}

@Model()
export class CursorRequest {
    @Property({required: false, description: "Number of items per page (default: 10)"})
    pageSize?: number;
    // Used for MongoDB
    @Property({required: false, description: "The `_id` of the last item from the previous page (optional)"})
    lastId?: string;
    // Used for SQL databases
    @Property({
        required: false,
        description: "The last seen value of the `sortField` from the previous page (optional)",
    })
    cursor?: string;
    @IsEnum(SortOrder)
    @Property({
        required: false,
        description: " The sort direction (`ASC` for ascending, `DESC` for descending, default: `ASC`)",
    })
    sortOrder?: SortOrder;
    @Property({required: false, itemType: "string", description: "The field used for sorting"})
    sortField?: string;
}
