/**
 *
 * OpenAPI Type	Description	Example
 * string	A textual value	"Hello World"
 * number	A floating-point number	3.14
 * integer	A whole number	42
 * boolean	A true/false value	true
 * array	A list of values	["apple", "banana"]
 * object	A JSON object	{"key": "value"}
 * null	Represents an explicitly null value (OpenAPI 3.1+)	null
 * */
type PropertyType = "string" | "number" | "integer" | "object" | "boolean" | "array" | "null";

export interface PropertyOptions {
    type?: PropertyType;
    description?: string;
    name?: string;
    itemType?: PropertyType;
    required?: boolean;
    example?: any;
}
