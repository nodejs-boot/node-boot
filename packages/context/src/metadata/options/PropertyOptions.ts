export type PropertyType = "string" | "number" | "integer" | "boolean" | "date" | "array" | "null" | Function; // Supports DTOs and enums
export type OPEN_API_TYPE_FORMAT =
    | "int32"
    | "int64"
    | "float"
    | "double"
    | "byte"
    | "binary"
    | "date"
    | "date-time"
    | "password"
    | string;

export interface PropertyOptions {
    type?: PropertyType;
    format?: OPEN_API_TYPE_FORMAT;
    description?: string;
    name?: string;
    itemType?: PropertyType | string;
    required?: boolean;
    example?: any;
    nullable?: boolean;
    enum?: any[];
}
