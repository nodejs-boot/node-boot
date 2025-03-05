type PropertyType = "string" | "number" | "integer" | "boolean" | "array" | "null" | Function; // Supports DTOs and enums

export interface PropertyOptions {
    type?: PropertyType;
    description?: string;
    name?: string;
    itemType?: PropertyType;
    required?: boolean;
    example?: any;
}
